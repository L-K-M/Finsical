import groovy.json.JsonSlurper
import java.awt.image.BufferedImage
import java.io.File
import javax.imageio.ImageIO
import javax.inject.Inject

plugins {
    id("com.android.application")
}

// The Finsical repository root: package.json, the web app, the icon art
// and the license files all live there.
val repoRoot: Directory = layout.projectDirectory.dir("../..")

// ---- Version: package.json is the only version source ----------------------
// providers.fileContents makes package.json a configuration-cache input, so a
// version bump invalidates the cached configuration.
val packageJson: RegularFile = repoRoot.file("package.json")
val packageJsonText: String = providers.fileContents(packageJson).asText.orNull
    ?: throw GradleException(
        "Cannot read ${packageJson.asFile}: the android/ directory must stay inside " +
            "the Finsical repository, next to package.json",
    )

val appVersionName: String =
    ((JsonSlurper().parseText(packageJsonText) as? Map<*, *>)?.get("version") as? String)
        ?: throw GradleException("${packageJson.asFile} has no string \"version\" field")

// versionCode must grow with every release, so it is derived from the
// version itself: X.Y.Z -> X*10000 + Y*100 + Z.
val appVersionCode: Int = run {
    val match = Regex("""(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)""").matchEntire(appVersionName)
        ?: throw GradleException(
            "package.json version \"$appVersionName\" is not plain X.Y.Z; the Android " +
                "versionCode is derived from it as X*10000 + Y*100 + Z",
        )
    val (major, minor, patch) = match.destructured.toList().map { it.toInt() }
    // 20999 keeps the code under Google Play's limit of 2100000000.
    if (minor > 99 || patch > 99 || major > 20999) {
        throw GradleException(
            "package.json version \"$appVersionName\" does not fit versionCode = " +
                "X*10000 + Y*100 + Z (needs Y <= 99, Z <= 99 and X <= 20999)",
        )
    }
    val code = major * 10000 + minor * 100 + patch
    if (code < 1) {
        throw GradleException("package.json version \"$appVersionName\" gives versionCode 0; it must be at least 1")
    }
    code
}

base {
    // Finsical-0.3.0-android-debug.apk, Finsical-0.3.0-android-release-unsigned.apk
    archivesName = "Finsical-$appVersionName-android"
}

android {
    namespace = "dev.finsical.app"
    compileSdk = 37
    // Java-only module: no Kotlin compile task and no kotlin-stdlib, which
    // AGP 9 would otherwise add to the APK.
    enableKotlin = false

    defaultConfig {
        applicationId = "dev.finsical.app"
        minSdk = 24
        // 37 rather than Play's minimum of 36: lint's OldTargetApi check
        // fails the build (warnings are errors) on anything older.
        targetSdk = 37
        versionCode = appVersionCode
        versionName = appVersionName
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildTypes {
        release {
            // No signing config on purpose: the release APK comes out
            // unsigned and CI signs it with apksigner, so keystore
            // passwords never enter Gradle's configuration cache.
            // Shrinking would save a few hundred bytes of dex and trips
            // lint's NotShrinkingResources.
            isMinifyEnabled = false
            vcsInfo { include = false }
        }
    }

    dependenciesInfo {
        includeInApk = false
        includeInBundle = false
    }

    androidResources {
        // AGP's default pattern also drops dotfiles and directories that
        // start with "_", silently. An imported pack may contain either,
        // so keep only the version-control and OS junk exclusions.
        ignoreAssetsPattern = "!.svn:!.git:!.ds_store:!*.scc:!CVS:!thumbs.db:!picasa.ini:!*~"
    }

    lint {
        abortOnError = true
        warningsAsErrors = true
        // These compare against the newest releases on the network and
        // would turn CI red on someone else's release day. Toolchain
        // bumps are deliberate changes instead.
        disable += setOf("GradleDependency", "AndroidGradlePluginVersion", "NewerVersionAvailable")
    }
}

dependencies {
    testImplementation("junit:junit:4.13.2")
}

// ---- Web root -> APK assets ------------------------------------------------
// The APK serves the same web root as the other shells: `npm run build`
// writes it to dist/ (macos/Makefile's bundle target does the same).

/** Runs `npm run build` in the repository root. */
abstract class BuildWeb : DefaultTask() {
    @get:InputFiles
    @get:PathSensitive(PathSensitivity.RELATIVE)
    abstract val sources: ConfigurableFileCollection

    @get:Internal
    abstract val repoDir: DirectoryProperty

    @get:Input
    abstract val npm: Property<String>

    @get:OutputDirectory
    abstract val distDir: DirectoryProperty

    @get:Inject
    abstract val execOps: ExecOperations

    @TaskAction
    fun build() {
        val root = repoDir.get().asFile
        if (!root.resolve("node_modules").isDirectory) {
            throw GradleException("$root/node_modules is missing: run `npm ci` in the repository root first")
        }
        // Only a failure to start npm throws here; a failed build is a
        // non-zero exit, reported below.
        val result = try {
            execOps.exec {
                workingDir = root
                commandLine(npm.get(), "run", "build")
                isIgnoreExitValue = true
            }
        } catch (e: Exception) {
            throw GradleException(
                "Could not start `${npm.get()} run build`, which builds the web root: install " +
                    "Node.js with npm and put it on the PATH of the shell that runs Gradle " +
                    "(after changing PATH, stop the running daemon with `./gradlew --stop`)",
                e,
            )
        }
        if (result.exitValue != 0) {
            throw GradleException("`npm run build` failed with exit code ${result.exitValue}; see its output above")
        }
    }
}

/**
 * Collects the APK's assets: the web root under web/ (with the optional
 * bundled pack under web/pack/), the license files under licenses/, and
 * the LGPL decoder's source under core/data/ (THIRD_PARTY_NOTICES.md
 * names that path; the bundles compile it in).
 */
abstract class SyncWebAssets : DefaultTask() {
    @get:InputDirectory
    @get:PathSensitive(PathSensitivity.RELATIVE)
    abstract val webRoot: DirectoryProperty

    // web/pack is gitignored and usually absent; @InputFiles (unlike
    // @InputDirectory) accepts a missing directory.
    @get:InputFiles
    @get:PathSensitive(PathSensitivity.RELATIVE)
    abstract val packDir: DirectoryProperty

    @get:InputFiles
    @get:PathSensitive(PathSensitivity.NAME_ONLY)
    abstract val licenseFiles: ConfigurableFileCollection

    @get:InputFile
    @get:PathSensitive(PathSensitivity.NAME_ONLY)
    abstract val decoderSource: RegularFileProperty

    @get:OutputDirectory
    abstract val outputDir: DirectoryProperty

    @get:Inject
    abstract val fs: FileSystemOperations

    @TaskAction
    fun sync() {
        val root = webRoot.get().asFile
        if (!root.resolve("index.html").isFile) {
            throw GradleException("$root/index.html is missing; `npm run build` did not produce the web root")
        }
        val missing = licenseFiles.files.filterNot { it.isFile }
        if (missing.isNotEmpty()) {
            throw GradleException("License files missing from the repository: ${missing.joinToString()}")
        }
        val pack = packDir.get().asFile
        fs.sync {
            into(outputDir)
            from(root) { into("web") }
            if (pack.isDirectory) from(pack) { into("web/pack") }
            from(licenseFiles) { into("licenses") }
            from(decoderSource) { into("core/data") }
        }
    }
}

val npmCommand: Provider<String> = providers.systemProperty("os.name")
    .map { if (it.startsWith("Windows")) "npm.cmd" else "npm" }

val buildWeb = tasks.register<BuildWeb>("buildWeb") {
    description = "Builds the web root (dist/) with npm run build."
    repoDir = repoRoot
    npm = npmCommand
    distDir = repoRoot.dir("dist")
    sources.from(
        // The gitignored dev-server outputs of `npm run dev` and the pack
        // are not build inputs.
        repoRoot.dir("web").asFileTree.matching { exclude("*.js", "osmium.css", "pack/**") },
        repoRoot.dir("core"),
        repoRoot.file("package.json"),
        repoRoot.file("package-lock.json"),
        repoRoot.file("tsconfig.json"),
    )
}

val syncWebAssets = tasks.register<SyncWebAssets>("syncWebAssets") {
    description = "Copies the web root and license files into the APK's assets."
    webRoot = buildWeb.flatMap { it.distDir }
    packDir = repoRoot.dir("web/pack")
    licenseFiles.from(
        repoRoot.file("LICENSE"),
        repoRoot.file("THIRD_PARTY_NOTICES.md"),
        repoRoot.file("LICENSES/LGPL-2.1.txt"),
    )
    decoderSource = repoRoot.file("core/data/mace.ts")
}

// ---- Launcher icons ---------------------------------------------------------
// Rendered from the same full-bleed square art as the macOS icon:
//   mipmap-*/ic_launcher.png         API 24-25 launchers, which show the
//                                    bitmap as is: rounded corners and a
//                                    small margin, drawn here
//   drawable-nodpi/ic_launcher_art.png  the adaptive icon's foreground art
//                                    (API 26+; res/drawable and
//                                    res/mipmap-anydpi-v26 place it)

/** Downscales the icon art into launcher bitmaps. */
abstract class GenerateLauncherIcons : DefaultTask() {
    @get:InputFile
    @get:PathSensitive(PathSensitivity.NONE)
    abstract val sourceImage: RegularFileProperty

    @get:OutputDirectory
    abstract val outputDir: DirectoryProperty

    // Legacy launcher icon: 48 dp in each density bucket.
    private val legacySizes = mapOf("mdpi" to 48, "hdpi" to 72, "xhdpi" to 96, "xxhdpi" to 144, "xxxhdpi" to 192)

    // The adaptive icon's 72 dp safe area at xxxhdpi (4x).
    private val artSize = 288

    // Legacy icon geometry, as fractions of the icon: a 2 dp margin on a
    // 48 dp icon, and a corner radius of 1/8 of the art.
    private val legacyMarginFraction = 1.0 / 24
    private val legacyRadiusFraction = 1.0 / 8

    // Per-axis subsamples for the anti-aliased corner coverage.
    private val coverageSamples = 4

    @TaskAction
    fun generate() {
        val file = sourceImage.get().asFile
        val image = ImageIO.read(file) ?: throw GradleException("$file is not an image javax.imageio can read")
        if (image.width != image.height) {
            throw GradleException("$file must be square, but it is ${image.width}x${image.height}")
        }
        val out = outputDir.get().asFile
        out.listFiles()?.forEach { it.deleteRecursively() }

        val src = LinearImage.of(image)
        for ((density, size) in legacySizes) {
            write(legacyIcon(src, size), out.resolve("mipmap-$density/ic_launcher.png"))
        }
        write(src.resized(artSize).toImage(BufferedImage.TYPE_INT_RGB), out.resolve("drawable-nodpi/ic_launcher_art.png"))
    }

    private fun legacyIcon(src: LinearImage, size: Int): BufferedImage {
        val margin = Math.round(size * legacyMarginFraction).toInt()
        val content = size - 2 * margin
        val art = src.resized(content).toImage(BufferedImage.TYPE_INT_ARGB)
        val radius = content * legacyRadiusFraction
        val icon = BufferedImage(size, size, BufferedImage.TYPE_INT_ARGB)
        for (y in 0 until content) {
            for (x in 0 until content) {
                val coverage = roundedSquareCoverage(x, y, content, radius)
                if (coverage == 0.0) continue
                val rgb = art.getRGB(x, y) and 0xFFFFFF
                val alpha = Math.round(coverage * 255).toInt()
                icon.setRGB(x + margin, y + margin, (alpha shl 24) or rgb)
            }
        }
        return icon
    }

    /** Fraction of pixel (x, y) inside a rounded square of side `side`. */
    private fun roundedSquareCoverage(x: Int, y: Int, side: Int, radius: Double): Double {
        var inside = 0
        for (sy in 0 until coverageSamples) {
            for (sx in 0 until coverageSamples) {
                val px = x + (sx + 0.5) / coverageSamples
                val py = y + (sy + 0.5) / coverageSamples
                val dx = px - px.coerceIn(radius, side - radius)
                val dy = py - py.coerceIn(radius, side - radius)
                if (dx * dx + dy * dy <= radius * radius) inside++
            }
        }
        return inside.toDouble() / (coverageSamples * coverageSamples)
    }

    private fun write(image: BufferedImage, file: File) {
        file.parentFile.mkdirs()
        if (!ImageIO.write(image, "png", file)) throw GradleException("No PNG writer available for $file")
    }

    /**
     * A square image in premultiplied linear-light RGBA. Averaging in
     * linear light keeps the highlights (bubbles, the fish's stripes)
     * from muddying as they shrink; StrictMath keeps the output
     * identical on every JVM.
     */
    private class LinearImage(val side: Int, val px: FloatArray) {
        fun resized(target: Int): LinearImage {
            val weights = boxWeights(side, target)
            // Horizontal pass: side x side -> target x side.
            val horizontal = FloatArray(target * side * 4)
            for (y in 0 until side) {
                for (x in 0 until target) {
                    for ((j, w) in weights[x]) {
                        for (c in 0 until 4) horizontal[(y * target + x) * 4 + c] += px[(y * side + j) * 4 + c] * w
                    }
                }
            }
            // Vertical pass: target x side -> target x target.
            val result = FloatArray(target * target * 4)
            for (y in 0 until target) {
                for ((j, w) in weights[y]) {
                    for (x in 0 until target) {
                        for (c in 0 until 4) result[(y * target + x) * 4 + c] += horizontal[(j * target + x) * 4 + c] * w
                    }
                }
            }
            return LinearImage(target, result)
        }

        fun toImage(type: Int): BufferedImage {
            val image = BufferedImage(side, side, type)
            for (i in 0 until side * side) {
                val a = px[i * 4 + 3]
                val rgb = if (a <= 0f) 0 else {
                    (encode(px[i * 4] / a) shl 16) or (encode(px[i * 4 + 1] / a) shl 8) or encode(px[i * 4 + 2] / a)
                }
                val alpha = Math.round(a.coerceIn(0f, 1f) * 255)
                image.setRGB(i % side, i / side, (alpha shl 24) or rgb)
            }
            return image
        }

        companion object {
            private val decodeTable = FloatArray(256) { v ->
                val c = v / 255.0
                (if (c <= 0.04045) c / 12.92 else StrictMath.pow((c + 0.055) / 1.055, 2.4)).toFloat()
            }

            fun of(image: BufferedImage): LinearImage {
                val side = image.width
                val argb = image.getRGB(0, 0, side, side, null, 0, side)
                val px = FloatArray(side * side * 4)
                for (i in argb.indices) {
                    val a = (argb[i] ushr 24) / 255f
                    px[i * 4] = decodeTable[(argb[i] shr 16) and 0xFF] * a
                    px[i * 4 + 1] = decodeTable[(argb[i] shr 8) and 0xFF] * a
                    px[i * 4 + 2] = decodeTable[argb[i] and 0xFF] * a
                    px[i * 4 + 3] = a
                }
                return LinearImage(side, px)
            }

            private fun encode(linear: Float): Int {
                val l = linear.toDouble().coerceIn(0.0, 1.0)
                val c = if (l <= 0.0031308) l * 12.92 else 1.055 * StrictMath.pow(l, 1 / 2.4) - 0.055
                return Math.round(c * 255).toInt().coerceIn(0, 255)
            }

            /**
             * Area-averaging weights: output pixel i covers source span
             * [i*n/m, (i+1)*n/m); each source pixel weighs its overlap.
             */
            private fun boxWeights(n: Int, m: Int): List<List<Pair<Int, Float>>> = List(m) { i ->
                val start = i.toDouble() * n / m
                val end = (i + 1).toDouble() * n / m
                (start.toInt() until Math.ceil(end).toInt()).map { j ->
                    j to ((minOf(end, j + 1.0) - maxOf(start, j.toDouble())) / (end - start)).toFloat()
                }
            }
        }
    }
}

val generateLauncherIcons = tasks.register<GenerateLauncherIcons>("generateLauncherIcons") {
    description = "Renders the launcher icon bitmaps from media-sources/icon-finsical.png."
    sourceImage = repoRoot.file("media-sources/icon-finsical.png")
}

androidComponents {
    onVariants { variant ->
        // Both variants share one task each; AGP wires the outputs lazily.
        variant.sources.assets?.addGeneratedSourceDirectory(syncWebAssets, SyncWebAssets::outputDir)
        variant.sources.res?.addGeneratedSourceDirectory(generateLauncherIcons, GenerateLauncherIcons::outputDir)
    }
}
