<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, type Component } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Boxes, Users, Wrench, ShoppingCart, Settings, Store, LayoutDashboard, UserRound, LogOut, PanelLeftClose, PanelLeftOpen, ChevronDown, Package, TriangleAlert, Truck, ClipboardList, CreditCard, Landmark, ChartNoAxesCombined, ShoppingBag, Tags, ScrollText, ListChecks, Smartphone, Mail } from "@lucide/vue";
import { signOut, staffSession } from "../../features/auth/session";
import { getSessionStore } from "../../features/admin/api";
import { startChatNotifications, stopChatNotifications, totalChatUnread } from "../../features/chat/notifications";
import ChatToastStack from "../../features/chat/ChatToastStack.vue";

interface NavigationItem { label: string; route: string; icon: Component; adminOnly?: boolean }
interface NavigationGroup { id: string; label: string; shortLabel?: string; icon: Component; items: NavigationItem[] }
const groups: NavigationGroup[] = [
  { id: "attention", label: "Atencion", icon: Wrench, items: [
    { label: "Clientes", route: "customers.list", icon: Users },
    { label: "Reparaciones", route: "repairs.list", icon: Wrench }
  ] },
  { id: "inventory", label: "Almacen", icon: Boxes, items: [
    { label: "Materiales", route: "inventory.list", icon: Package, adminOnly: true },
    { label: "Alertas de stock", route: "inventory.alerts", icon: TriangleAlert, adminOnly: true },
    { label: "Proveedores", route: "suppliers.list", icon: Truck, adminOnly: true },
    { label: "Ordenes de compra", route: "purchase-orders.list", icon: ClipboardList, adminOnly: true }
  ] },
  { id: "sales", label: "Ventas", icon: ShoppingCart, items: [
    { label: "TPV", route: "payments.list", icon: CreditCard, adminOnly: true },
    { label: "Caja", route: "payments.cash-register", icon: Landmark, adminOnly: true },
    { label: "Informes", route: "payments.reports", icon: ChartNoAxesCombined, adminOnly: true },
    { label: "Compraventa", route: "trade-in.list", icon: Tags },
    { label: "Catalogo tienda", route: "ecommerce.products.list", icon: ShoppingBag, adminOnly: true },
    { label: "Pedidos tienda", route: "ecommerce.orders", icon: ClipboardList, adminOnly: true }
  ] },
  { id: "administration", label: "Administracion", shortLabel: "Admin", icon: Settings, items: [
    { label: "Panel", route: "admin.dashboard", icon: LayoutDashboard, adminOnly: true },
    { label: "Tiendas", route: "admin.stores.list", icon: Store, adminOnly: true },
    { label: "Usuarios", route: "admin.users.list", icon: Users, adminOnly: true },
    { label: "Estados", route: "admin.config.statuses", icon: ListChecks, adminOnly: true },
    { label: "Dispositivos", route: "admin.config.devices", icon: Smartphone, adminOnly: true },
    { label: "Plantillas", route: "admin.config.templates", icon: Mail, adminOnly: true },
    { label: "Auditoria", route: "admin.audit.list", icon: ScrollText, adminOnly: true }
  ] }
];
const route = useRoute();
const router = useRouter();
const isAdmin = computed(() => staffSession.value?.user.role === "admin");
const visibleGroups = computed(() => groups.map((group) => ({ ...group, items: group.items.filter((item) => !item.adminOnly || isAdmin.value) })).filter((group) => group.items.length));
const selectedGroup = ref("attention");
const activeGroup = computed(() => visibleGroups.value.find((group) => group.id === selectedGroup.value) ?? visibleGroups.value[0]);
const unread = computed(() => totalChatUnread());
const collapseKey = "xtechjs.navigation.collapsed";
function savedCollapse(): boolean { try { const saved = localStorage.getItem(collapseKey); return saved === null ? window.innerWidth <= 720 : saved === "true"; } catch { return window.innerWidth <= 720; } }
const collapsed = ref(savedCollapse());
const compactViewport = ref(window.innerWidth <= 720);
function resizeNavigation(): void { compactViewport.value = window.innerWidth <= 720; if (compactViewport.value) collapsed.value = true; }
watch(collapsed, (value) => { try { localStorage.setItem(collapseKey, String(value)); } catch {} });
function matchesItem(item: NavigationItem): boolean {
  const name = String(route.name ?? "");
  return name === item.route || name.startsWith(`${item.route.replace(/\.list$/, "")}.`);
}
const currentItem = computed(() => visibleGroups.value.flatMap((group) => group.items).find((item) => item.route === route.name)
  ?? visibleGroups.value.flatMap((group) => group.items).find(matchesItem));
watch([() => route.name, isAdmin], () => {
  selectedGroup.value = visibleGroups.value.find((group) => group.items.some(matchesItem))?.id ?? visibleGroups.value[0]?.id ?? "attention";
}, { immediate: true });
function selectGroup(group: NavigationGroup): void { selectedGroup.value = group.id; collapsed.value = true; }
const now = ref(new Date());
const dateFormatter = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", weekday: "long", day: "numeric", month: "long", year: "numeric" });
const timeFormatter = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
const clockDate = computed(() => dateFormatter.format(now.value));
const clockTime = computed(() => timeFormatter.format(now.value));
const storeLabel = ref("");
const sessionContext = computed(() => isAdmin.value ? "Vista de administrador" : storeLabel.value || "Sin tienda asignada");
const accountMenu = ref<HTMLDetailsElement | null>(null);
let clockTimer: ReturnType<typeof setInterval> | undefined;
let sessionVersion = 0;
function closeProfile(): void { accountMenu.value?.removeAttribute("open"); }
function closeOutsideProfile(event: PointerEvent): void { if (!accountMenu.value?.contains(event.target as Node)) closeProfile(); }
function logout(): void { signOut(); stopChatNotifications(); void router.push({ name: "staff.login" }); }
function openChat(repairOrderId: string): void { void router.push({ name: "repairs.detail.chat", params: { id: repairOrderId } }); }
watch(staffSession, async (session) => {
  const version = ++sessionVersion;
  storeLabel.value = "";
  if (!session) return;
  startChatNotifications(session.accessToken, session.user.id);
  if (session.user.role === "admin" || !session.user.storeId) return;
  storeLabel.value = "Cargando tienda...";
  try {
    const store = await getSessionStore();
    if (version === sessionVersion) storeLabel.value = store ? `${store.name}${store.active ? "" : " (inactiva)"}` : "Tienda no disponible";
  } catch { if (version === sessionVersion) storeLabel.value = "No se pudo cargar la tienda"; }
}, { immediate: true });
onMounted(() => {
  clockTimer = setInterval(() => { now.value = new Date(); }, 1000);
  document.addEventListener("pointerdown", closeOutsideProfile);
  window.addEventListener("resize", resizeNavigation);
});
onUnmounted(() => {
  clearInterval(clockTimer);
  ++sessionVersion;
  document.removeEventListener("pointerdown", closeOutsideProfile);
  window.removeEventListener("resize", resizeNavigation);
  stopChatNotifications();
});
</script>

<template>
  <div class="workspace-shell">
    <a class="skip-link" href="#workspace-content">Ir al contenido</a>
    <ChatToastStack @select="openChat" />
    <div class="workspace-header">
      <header class="topbar">
        <RouterLink class="brand" :to="isAdmin ? { name: 'admin.dashboard' } : { name: 'customers.list' }">xTech<span>JS</span></RouterLink>
        <nav class="main-navigation" aria-label="Modulos principales">
          <button v-for="group in visibleGroups" :key="group.id" type="button" :class="{ selected: selectedGroup === group.id }" :aria-label="group.label" :aria-pressed="selectedGroup === group.id" aria-controls="section-navigation" @click="selectGroup(group)">
            <component :is="group.icon" :size="18" aria-hidden="true" />
            <span class="group-label">{{ group.label }}</span><span class="group-short-label">{{ group.shortLabel ?? group.label }}</span>
            <span v-if="group.id === 'attention' && unread" class="unread-dot" :aria-label="`${unread} mensajes sin leer`">{{ unread }}</span>
          </button>
        </nav>
        <div class="account-actions">
          <details ref="accountMenu" class="account" @keydown.esc="closeProfile">
            <summary aria-label="Mi perfil" title="Mi perfil"><UserRound :size="18" aria-hidden="true" /><span>{{ staffSession?.user.displayName }}</span><ChevronDown :size="14" aria-hidden="true" /></summary>
            <div class="account-popover"><strong>{{ staffSession?.user.displayName }}</strong><span>{{ staffSession?.user.email }}</span><span>{{ isAdmin ? 'Administrador' : 'Empleado' }}</span><RouterLink :to="{ name: 'staff.profile' }" @click="closeProfile"><UserRound :size="16" aria-hidden="true" />Gestionar mi perfil</RouterLink></div>
          </details>
          <button class="icon-button sign-out" type="button" title="Cerrar sesion" aria-label="Cerrar sesion" @click="logout"><LogOut :size="19" aria-hidden="true" /></button>
        </div>
      </header>
      <div class="sessionbar">
        <div class="session-context"><component :is="isAdmin ? Settings : Store" :size="16" aria-hidden="true" /><strong>{{ sessionContext }}</strong></div>
        <time class="workspace-clock" :datetime="now.toISOString()"><span>{{ clockDate }}</span><strong>{{ clockTime }}</strong></time>
      </div>
    </div>
    <div class="workspace" :class="{ 'workspace-collapsed': collapsed }" @keydown.esc="collapsed = true">
      <button v-if="compactViewport && !collapsed" class="sidebar-backdrop" type="button" aria-label="Cerrar menu lateral" @click="collapsed = true" />
      <aside class="section-sidebar" :class="{ collapsed }" :aria-label="activeGroup?.label">
        <div class="sidebar-heading"><span v-if="!collapsed">{{ activeGroup?.label }}</span><button class="icon-button sidebar-toggle" type="button" :title="collapsed ? 'Expandir menu lateral' : 'Plegar menu lateral'" :aria-label="collapsed ? 'Expandir menu lateral' : 'Plegar menu lateral'" :aria-expanded="!collapsed" aria-controls="section-navigation" @click="collapsed = !collapsed"><component :is="collapsed ? PanelLeftOpen : PanelLeftClose" :size="20" aria-hidden="true" /></button></div>
        <nav id="section-navigation" class="section-navigation" :aria-label="`Opciones de ${activeGroup?.label}`">
          <RouterLink v-for="item in activeGroup?.items" :key="item.route" :to="{ name: item.route }" :class="{ 'section-current': currentItem?.route === item.route }" :aria-label="item.label" :aria-current="currentItem?.route === item.route ? 'page' : undefined" @click="compactViewport && (collapsed = true)">
            <component :is="item.icon" :size="20" aria-hidden="true" /><span v-if="!collapsed" class="item-label">{{ item.label }}</span>
            <span v-if="item.route === 'repairs.list' && unread" class="sidebar-unread" :aria-label="`${unread} mensajes sin leer`">{{ unread }}</span>
            <span v-if="collapsed" class="nav-tooltip" role="tooltip">{{ item.label }}</span>
          </RouterLink>
        </nav>
      </aside>
      <main id="workspace-content" class="content" tabindex="-1"><RouterView /></main>
    </div>
  </div>
</template>

<style scoped>
.workspace-shell { --shell-green: #173c36; --shell-border: #cbd7d0; display: grid; grid-template-rows: auto 1fr; min-height: 100dvh; }
.workspace-header { background: #fff; border-bottom: 1px solid var(--shell-border); }
.topbar { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 24px; align-items: center; padding: 12px 24px; }
.topbar .brand { color: var(--shell-green); margin: 0; font-size: 24px; white-space: nowrap; }
.topbar .brand span { color: #b94730; }
.main-navigation { display: flex; gap: 6px; min-width: 0; }
.main-navigation button { background: transparent; border-radius: 0; border-bottom: 3px solid transparent; color: #49675a; display: flex; gap: 8px; align-items: center; justify-content: center; min-height: 46px; padding: 10px 12px; font-size: 13px; white-space: nowrap; }
.main-navigation button:hover { background: #edf3ef; }
.main-navigation button.selected { color: var(--shell-green); border-bottom-color: #df593c; }
.group-short-label { display: none; }
.account-actions { display: flex; align-items: center; gap: 12px; min-width: 0; }
.account { position: relative; min-width: 0; }
.account summary { display: flex; gap: 8px; align-items: center; cursor: pointer; font-size: 12px; color: var(--shell-green); min-height: 40px; }
.account summary::-webkit-details-marker { display: none; }
.account summary > span { max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.account-popover { background: #fff; border: 1px solid var(--shell-border); box-shadow: 0 8px 24px #173c3620; border-radius: 6px; display: grid; gap: 8px; position: absolute; right: 0; top: calc(100% + 12px); width: min(280px, calc(100vw - 32px)); padding: 18px; z-index: 40; font-size: 12px; overflow-wrap: anywhere; }
.account-popover span { color: #49675a; }
.account-popover a { display: flex; align-items: center; gap: 8px; color: #173c36; border-top: 1px solid #cbd7d0; padding-top: 12px; text-decoration: none; font-weight: 700; }
.account-popover a:hover { color: #b94730; }
.icon-button { width: 40px; height: 40px; flex: 0 0 40px; display: inline-flex; align-items: center; justify-content: center; padding: 0; border-radius: 4px; }
.sign-out { color: #a33424; background: #faeee9; }
.sign-out:hover { background: #f5dcd2; }
.sessionbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 9px 24px; border-top: 1px solid #e4ebe6; background: #f6f9f7; }
.session-context { display: flex; align-items: center; gap: 8px; min-width: 0; color: #49675a; font-size: 12px; }
.session-context svg { flex-shrink: 0; }
.session-context strong { overflow-wrap: anywhere; }
.workspace-clock { display: flex; gap: 16px; align-items: center; font-size: 11px; color: #49675a; }
.workspace-clock strong { color: var(--shell-green); font-family: 'DM Mono', monospace; font-size: 13px; white-space: nowrap; font-variant-numeric: tabular-nums; }
.workspace { position: relative; grid-template-columns: 220px minmax(0, 1fr); min-height: 0; }
.sidebar-backdrop { position: absolute; inset: 0; background: #17252a50; border-radius: 0; padding: 0; z-index: 20; }
.sidebar-backdrop:hover { background: #17252a50; }
.workspace.workspace-collapsed { grid-template-columns: 68px minmax(0, 1fr); }
.section-sidebar { background: var(--shell-green); color: #dce9e2; padding: 16px 12px; min-width: 0; }
.sidebar-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 18px; min-height: 40px; font-size: 12px; font-weight: 700; }
.sidebar-heading > span { padding-left: 10px; }
.sidebar-toggle { background: #28534a; color: #fff; }
.sidebar-toggle:hover { background: #3a625a; }
.section-navigation { display: grid; gap: 6px; overflow: visible; }
.section-navigation a { position: relative; display: flex; gap: 12px; align-items: center; min-height: 44px; padding: 10px; color: #dce9e2; font-size: 12px; text-decoration: none; border-radius: 4px; }
.section-navigation a:hover, .section-navigation a.section-current { background: #28534a; color: #fff; }
.section-navigation a.section-current { box-shadow: inset 3px 0 #e5c25b; }
.section-navigation svg { flex-shrink: 0; }
.item-label { overflow-wrap: anywhere; }
.collapsed .sidebar-heading { justify-content: center; }
.collapsed .section-navigation a { justify-content: center; }
.unread-dot, .sidebar-unread { background: #df593c; color: #fff; font-size: 10px; min-width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; border-radius: 9px; padding: 0 4px; }
.sidebar-unread { margin-left: auto; }
.collapsed .sidebar-unread { position: absolute; right: -2px; top: 0; }
.nav-tooltip { position: absolute; left: calc(100% + 12px); top: 50%; transform: translateY(-50%); z-index: 30; width: max-content; max-width: 200px; background: #17252a; color: #fff; border-radius: 4px; padding: 8px 12px; opacity: 0; visibility: hidden; pointer-events: none; box-shadow: 0 4px 12px #173c3620; }
.section-navigation a:hover .nav-tooltip, .section-navigation a:focus-visible .nav-tooltip { opacity: 1; visibility: visible; }
.content { min-width: 0; max-width: none; padding: 32px; }
.skip-link { position: fixed; top: -60px; left: 16px; z-index: 100; background: #fff; color: var(--shell-green); padding: 12px; }
.skip-link:focus { top: 12px; }
button:focus-visible, summary:focus-visible, .section-navigation a:focus-visible { outline: 2px solid #df593c; outline-offset: 3px; }
@media (max-width: 1100px) {
  .topbar { grid-template-columns: minmax(0, 1fr) auto; gap: 8px 16px; }
  .main-navigation { grid-column: 1 / -1; grid-row: 2; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
@media (max-width: 720px) {
  .workspace { display: grid; grid-template-columns: 56px minmax(0, 1fr); }
  .workspace.workspace-collapsed { grid-template-columns: 56px minmax(0, 1fr); }
  .topbar { padding: 10px 12px; }
  .sessionbar { padding: 10px 12px; align-items: start; }
  .workspace-clock { display: grid; gap: 4px; text-align: right; max-width: 55%; }
  .section-sidebar { padding: 12px 6px; }
  .section-sidebar:not(.collapsed) { position: absolute; inset: 0 auto 0 0; width: min(240px, calc(100vw - 56px)); z-index: 25; box-shadow: 8px 0 24px #173c3630; }
  .content { grid-column: 2; }
  .content { padding: 24px 16px; }
}
@media (max-width: 520px) {
  .main-navigation button { flex-direction: column; gap: 4px; padding: 8px 2px; font-size: 11px; position: relative; }
  .group-label { display: none; }
  .group-short-label { display: inline; }
  .unread-dot { position: absolute; right: 6px; top: 4px; }
  .account summary > span { display: none; }
  .account-actions { gap: 8px; }
  .section-navigation a { gap: 8px; padding: 10px 6px; }
  .content { padding: 20px 12px; }
}
</style>