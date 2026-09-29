"""The app's menu bar as a com.canonical.dbusmenu object on the session
bus: what KDE's Global Menu widget shows. Windows point at it with
announce_x11 (window properties) or wayland.announce_appmenu.

The layout is built fresh for every request from a MenuSource, so
labels, check marks and disabled items are always current; refresh()
tells the reader to fetch it again after a change.

Import only after app.py has chosen the GDK backend.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Optional

from gi.repository import Gio, GLib

from . import logic

log = logic.log

INTERFACE = "com.canonical.dbusmenu"
OBJECT_PATH = "/dev/finsical/MenuBar"
_ROOT_ID = 0
# The DBusMenu protocol version libdbusmenu and libdbusmenu-qt speak.
_PROTOCOL_VERSION = 3
_LAYOUT = "(ia{sv}av)"

_XML = f"""
<node>
  <interface name="{INTERFACE}">
    <method name="GetLayout">
      <arg type="i" name="parentId" direction="in"/>
      <arg type="i" name="recursionDepth" direction="in"/>
      <arg type="as" name="propertyNames" direction="in"/>
      <arg type="u" name="revision" direction="out"/>
      <arg type="{_LAYOUT}" name="layout" direction="out"/>
    </method>
    <method name="GetGroupProperties">
      <arg type="ai" name="ids" direction="in"/>
      <arg type="as" name="propertyNames" direction="in"/>
      <arg type="a(ia{{sv}})" name="properties" direction="out"/>
    </method>
    <method name="GetProperty">
      <arg type="i" name="id" direction="in"/>
      <arg type="s" name="name" direction="in"/>
      <arg type="v" name="value" direction="out"/>
    </method>
    <method name="Event">
      <arg type="i" name="id" direction="in"/>
      <arg type="s" name="eventId" direction="in"/>
      <arg type="v" name="data" direction="in"/>
      <arg type="u" name="timestamp" direction="in"/>
    </method>
    <method name="EventGroup">
      <arg type="a(isvu)" name="events" direction="in"/>
      <arg type="ai" name="idErrors" direction="out"/>
    </method>
    <method name="AboutToShow">
      <arg type="i" name="id" direction="in"/>
      <arg type="b" name="needUpdate" direction="out"/>
    </method>
    <method name="AboutToShowGroup">
      <arg type="ai" name="ids" direction="in"/>
      <arg type="ai" name="updatesNeeded" direction="out"/>
      <arg type="ai" name="idErrors" direction="out"/>
    </method>
    <signal name="ItemsPropertiesUpdated">
      <arg type="a(ia{{sv}})" name="updatedProps"/>
      <arg type="a(ias)" name="removedProps"/>
    </signal>
    <signal name="LayoutUpdated">
      <arg type="u" name="revision"/>
      <arg type="i" name="parent"/>
    </signal>
    <signal name="ItemActivationRequested">
      <arg type="i" name="id"/>
      <arg type="u" name="timestamp"/>
    </signal>
    <property name="Version" type="u" access="read"/>
    <property name="TextDirection" type="s" access="read"/>
    <property name="Status" type="s" access="read"/>
    <property name="IconThemePath" type="as" access="read"/>
  </interface>
</node>
"""


@dataclass(frozen=True)
class Item:
    """One menu item as the app sees it right now."""

    action: str
    label: str
    enabled: bool
    # None: a plain item; otherwise a check item and whether it is on.
    checked: Optional[bool]
    accel: Optional[str]


# The item for an action, or None to leave it out.
MenuSource = Callable[[str], Optional[Item]]


class _Node:
    def __init__(
        self,
        node_id: int,
        props: dict[str, GLib.Variant],
        children: list[_Node],
        action: Optional[str] = None,
    ) -> None:
        self.id = node_id
        self.props = props
        self.children = children
        self.action = action


def _item_props(item: Item) -> dict[str, GLib.Variant]:
    # DBusMenu marks mnemonics with "_"; a literal one is doubled.
    props = {
        "label": GLib.Variant("s", item.label.replace("_", "__")),
        "enabled": GLib.Variant("b", item.enabled),
    }
    if item.checked is not None:
        props["toggle-type"] = GLib.Variant("s", "checkmark")
        props["toggle-state"] = GLib.Variant("i", 1 if item.checked else 0)
    if item.accel is not None:
        keys = logic.dbusmenu_shortcut(item.accel)
        if keys is not None:
            props["shortcut"] = GLib.Variant("aas", [keys])
    return props


def build_tree(source: MenuSource) -> tuple[_Node, dict[int, _Node]]:
    """The menu bar from logic.MENU_BAR. Ids follow the table's order,
    so they stay the same from one build to the next."""
    nodes: dict[int, _Node] = {}
    next_id = _ROOT_ID + 1
    menus = []
    for menu in logic.MENU_BAR:
        menu_id = next_id
        next_id += 1
        children = []
        for action in menu.actions:
            node_id = next_id
            next_id += 1
            if action is None:
                child = _Node(
                    node_id, {"type": GLib.Variant("s", "separator")}, []
                )
            else:
                item = source(action)
                if item is None:
                    continue
                child = _Node(node_id, _item_props(item), [], action)
            nodes[node_id] = child
            children.append(child)
        node = _Node(
            menu_id,
            {
                "label": GLib.Variant("s", menu.title),
                "children-display": GLib.Variant("s", "submenu"),
            },
            children,
        )
        nodes[menu_id] = node
        menus.append(node)
    root = _Node(
        _ROOT_ID,
        {"children-display": GLib.Variant("s", "submenu")},
        menus,
    )
    nodes[_ROOT_ID] = root
    return root, nodes


def _filtered(
    props: dict[str, GLib.Variant], names: list[str]
) -> dict[str, GLib.Variant]:
    if not names:
        return props
    return {k: v for k, v in props.items() if k in names}


def _layout(node: _Node, depth: int, names: list[str]) -> GLib.Variant:
    """depth -1 is the whole subtree, 0 the node alone."""
    children = []
    if depth != 0:
        children = [
            _layout(c, depth - 1 if depth > 0 else -1, names)
            for c in node.children
        ]
    return GLib.Variant(
        _LAYOUT, (node.id, _filtered(node.props, names), children)
    )


class MenuExporter:
    """Serves the menu bar on `connection` until unexport()."""

    def __init__(
        self,
        connection: Gio.DBusConnection,
        source: MenuSource,
        activate: Callable[[str], None],
    ) -> None:
        self._connection = connection
        self._source = source
        self._activate = activate
        self._revision = 1
        self._snapshot = self._props_snapshot()
        info = Gio.DBusNodeInfo.new_for_xml(_XML).interfaces[0]
        self._registration = connection.register_object(
            OBJECT_PATH, info, self._on_call, self._on_get_property, None
        )

    @property
    def connection(self) -> Gio.DBusConnection:
        return self._connection

    @property
    def bus_name(self) -> str:
        return self._connection.get_unique_name()

    def unexport(self) -> None:
        if self._registration:
            self._connection.unregister_object(self._registration)
            self._registration = 0

    def refresh(self) -> None:
        """Tell the reader to fetch the layout again if anything shown
        changed (a label, a check mark, an enabled state)."""
        snapshot = self._props_snapshot()
        if snapshot == self._snapshot:
            return
        self._snapshot = snapshot
        self._revision += 1
        try:
            self._connection.emit_signal(
                None,
                OBJECT_PATH,
                INTERFACE,
                "LayoutUpdated",
                GLib.Variant("(ui)", (self._revision, _ROOT_ID)),
            )
        except GLib.Error as e:
            # The bus went away (logout): the menu has no reader left.
            log.info("global menu update not sent: %s", e.message)

    def _props_snapshot(self) -> list[tuple[int, str]]:
        _root, nodes = build_tree(self._source)
        return [
            (i, str(sorted((k, v.print_(False)) for k, v in n.props.items())))
            for i, n in sorted(nodes.items())
        ]

    def _on_get_property(
        self,
        _connection: Gio.DBusConnection,
        _sender: str,
        _path: str,
        _interface: str,
        name: str,
    ) -> Optional[GLib.Variant]:
        return {
            "Version": GLib.Variant("u", _PROTOCOL_VERSION),
            "TextDirection": GLib.Variant("s", "ltr"),
            "Status": GLib.Variant("s", "normal"),
            "IconThemePath": GLib.Variant("as", []),
        }.get(name)

    def _on_call(
        self,
        _connection: Gio.DBusConnection,
        _sender: str,
        _path: str,
        _interface: str,
        method: str,
        params: GLib.Variant,
        invocation: Gio.DBusMethodInvocation,
    ) -> None:
        # Every call gets exactly one reply, or the reader waits out its
        # timeout.
        try:
            args = params.unpack()
            root, nodes = build_tree(self._source)
            reply = self._dispatch(method, args, root, nodes)
        except KeyError as e:
            invocation.return_dbus_error(
                "com.canonical.dbusmenu.Error.InvalidId", f"no item {e}"
            )
            return
        except ValueError as e:
            invocation.return_dbus_error(
                "org.freedesktop.DBus.Error.UnknownMethod", str(e)
            )
            return
        except Exception as e:
            log.warning("global menu: %s failed: %s", method, e)
            invocation.return_dbus_error(
                "org.freedesktop.DBus.Error.Failed", str(e)
            )
            return
        invocation.return_value(reply)

    def _dispatch(
        self,
        method: str,
        args: Any,
        root: _Node,
        nodes: dict[int, _Node],
    ) -> Optional[GLib.Variant]:
        if method == "GetLayout":
            parent, depth, names = args
            layout = _layout(nodes[parent], depth, list(names))
            return GLib.Variant.new_tuple(
                GLib.Variant("u", self._revision), layout
            )
        if method == "GetGroupProperties":
            ids, names = args
            wanted = ids or list(nodes)
            found = [
                (i, _filtered(nodes[i].props, list(names)))
                for i in wanted
                if i in nodes
            ]
            return GLib.Variant("(a(ia{sv}))", (found,))
        if method == "GetProperty":
            node_id, name = args
            return GLib.Variant.new_tuple(
                GLib.Variant("v", nodes[node_id].props[name])
            )
        if method == "Event":
            node_id, event, _data, _time = args
            self._event(nodes, node_id, event)
            return None
        if method == "EventGroup":
            (events,) = args
            # The spec: the ids not found; an error if none is.
            errors = [i for i, *_rest in events if i not in nodes]
            if events and len(errors) == len(events):
                raise KeyError(errors[0])
            for node_id, event, _data, _time in events:
                if node_id in nodes:
                    self._event(nodes, node_id, event)
            return GLib.Variant("(ai)", (errors,))
        if method == "AboutToShow":
            # The layout is built fresh for every request; refresh()
            # has already announced any change.
            self.refresh()
            return GLib.Variant("(b)", (False,))
        if method == "AboutToShowGroup":
            (ids,) = args
            errors = [i for i in ids if i not in nodes]
            if ids and len(errors) == len(ids):
                raise KeyError(errors[0])
            self.refresh()
            return GLib.Variant("(aiai)", ([], errors))
        raise ValueError(f"unknown method {method}")

    def _event(
        self, nodes: dict[int, _Node], node_id: int, event: str
    ) -> None:
        if event != "clicked":
            return
        action = nodes[node_id].action
        if action is None:
            return
        def run() -> bool:
            self._activate(action)
            return GLib.SOURCE_REMOVE

        # After the reply: an action may open a window or quit.
        GLib.idle_add(run)


def session_bus() -> Optional[Gio.DBusConnection]:
    """The session bus, or None (logged) where there is none: then
    there is no global menu either."""
    try:
        return Gio.bus_get_sync(Gio.BusType.SESSION, None)
    except GLib.Error as e:
        log.info("no session bus, so no global menu: %s", e.message)
        return None
