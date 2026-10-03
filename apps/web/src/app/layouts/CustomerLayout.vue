<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ChevronRight, ClipboardList, LogOut, PanelLeftClose, PanelLeftOpen, ShoppingBag, Store, UserRound, Wrench } from "@lucide/vue";
import { customerSession, signOutCustomer } from "../../features/customer-portal/session";
import { startChatNotifications, stopChatNotifications } from "../../features/chat/notifications";
import ChatToastStack from "../../features/chat/ChatToastStack.vue";

const route = useRoute();
const router = useRouter();
const customer = computed(() => customerSession.value?.user);
const items = [
	{ label: "Reparaciones", route: "customer.portal", icon: Wrench },
	{ label: "Pedidos", route: "customer.orders", icon: ClipboardList },
	{ label: "Vender mi equipo", route: "customer.trade-in.list", icon: ShoppingBag },
	{ label: "Tienda", route: "shop.catalog", icon: Store }
];
const navigationKey = "xtechjs.customer-navigation.collapsed";
function savedCollapsed(): boolean { try { const value = localStorage.getItem(navigationKey); return value === null ? window.innerWidth <= 720 : value === "true"; } catch { return window.innerWidth <= 720; } }
const collapsed = ref(savedCollapsed());
const compactViewport = ref(window.innerWidth <= 720);
const activeLabel = computed(() => items.find((item) => route.name === item.route || (item.route === "customer.portal" && route.name === "customer.repair.detail"))?.label ?? "Mi cuenta");
function isActive(name: string): boolean { return route.name === name || (name === "customer.portal" && route.name === "customer.repair.detail"); }
function toggleNavigation(): void { collapsed.value = !collapsed.value; }
function resizeNavigation(): void { compactViewport.value = window.innerWidth <= 720; if (compactViewport.value) collapsed.value = true; }
function closeNavigation(): void { collapsed.value = true; }
function openChat(repairOrderId: string): void { void router.push({ name: "customer.repair.detail", params: { id: repairOrderId } }); closeNavigation(); }
function logout(): void { signOutCustomer(); void router.replace({ name: "customer.login" }); }
watch(collapsed, (value) => { try { localStorage.setItem(navigationKey, String(value)); } catch {} });
watch(customerSession, (session) => { if (session) startChatNotifications(session.accessToken, session.user.id); else stopChatNotifications(); }, { immediate: true });
onMounted(() => window.addEventListener("resize", resizeNavigation));
onUnmounted(() => { window.removeEventListener("resize", resizeNavigation); stopChatNotifications(); });
</script>

<template>
	<div class="customer-shell" :class="{ 'customer-shell-collapsed': collapsed }" @keydown.esc="closeNavigation">
		<ChatToastStack @select="openChat" />
		<button v-if="compactViewport && !collapsed" class="customer-backdrop" type="button" aria-label="Cerrar menu" @click="closeNavigation" />
		<aside class="customer-sidebar" :class="{ collapsed }" aria-label="Navegacion del portal de cliente">
			<div class="customer-sidebar-head"><RouterLink class="customer-brand" :to="{ name: 'customer.portal' }" aria-label="xTechJS, mi cuenta">xTech<span>JS</span></RouterLink><button class="customer-nav-toggle" type="button" :aria-label="collapsed ? 'Expandir menu' : 'Contraer menu'" :aria-expanded="!collapsed" title="Mostrar u ocultar nombres del menu" @click="toggleNavigation"><component :is="collapsed ? PanelLeftOpen : PanelLeftClose" :size="19" aria-hidden="true" /></button></div>
			<p v-if="!collapsed" class="customer-sidebar-label">Mi cuenta</p>
			<nav class="customer-navigation" aria-label="Secciones del cliente">
				<RouterLink v-for="item in items" :key="item.route" :to="{ name: item.route }" :class="{ 'customer-nav-active': isActive(item.route) }" :aria-label="item.label" :aria-current="isActive(item.route) ? 'page' : undefined" @click="compactViewport && closeNavigation()"><component :is="item.icon" :size="20" aria-hidden="true" /><span v-if="!collapsed">{{ item.label }}</span><span v-if="collapsed" class="customer-nav-tooltip" role="tooltip">{{ item.label }}</span><ChevronRight v-if="!collapsed && isActive(item.route)" :size="15" class="customer-nav-chevron" aria-hidden="true" /></RouterLink>
			</nav>
			<div class="customer-sidebar-profile"><UserRound :size="20" aria-hidden="true" /><div v-if="!collapsed" class="customer-profile-copy"><strong>{{ customer?.displayName }}</strong><span>{{ customer?.email }}</span></div><button class="customer-sign-out" type="button" aria-label="Cerrar sesion" title="Cerrar sesion" @click="logout"><LogOut :size="18" aria-hidden="true" /><span v-if="!collapsed">Salir</span></button></div>
		</aside>
		<div class="customer-main-wrap"><header class="customer-topbar"><div><p class="eyebrow">Portal de cliente</p><strong>{{ activeLabel }}</strong></div><div class="customer-topbar-account"><span>{{ customer?.displayName }}</span></div></header><main id="customer-content" class="customer-main"><RouterView /></main></div>
	</div>
</template>

<style scoped>
.customer-shell { --customer-green: #173c36; display: grid; grid-template-columns: 244px minmax(0, 1fr); min-height: 100dvh; overflow-x: clip; position: relative; }
.customer-shell-collapsed { grid-template-columns: 72px minmax(0, 1fr); }
.customer-sidebar { background: var(--customer-green); color: #dce9e2; display: flex; flex-direction: column; min-width: 0; padding: 20px 14px; z-index: 2; }
.customer-sidebar-head { align-items: center; display: flex; justify-content: space-between; gap: 8px; min-height: 44px; }
.customer-brand { color: #fff; font-size: 23px; font-weight: 800; margin-left: 8px; text-decoration: none; white-space: nowrap; }
.customer-brand span { color: #e5c25b; }
.customer-nav-toggle { align-items: center; background: #28534a; border-radius: 4px; color: #fff; display: inline-flex; flex: 0 0 38px; height: 38px; justify-content: center; padding: 0; width: 38px; }
.customer-sidebar-label { color: #9db8ad; font-family: "DM Mono", monospace; font-size: 10px; margin: 28px 10px 10px; text-transform: uppercase; }
.customer-navigation { display: grid; gap: 5px; overflow: visible; }
.customer-navigation a { align-items: center; border-radius: 4px; color: #c6d8cf; display: flex; gap: 12px; min-height: 44px; padding: 10px; position: relative; text-decoration: none; }
.customer-navigation a:hover, .customer-navigation a.customer-nav-active { background: #28534a; color: #fff; }
.customer-navigation a.customer-nav-active { box-shadow: inset 3px 0 #e5c25b; }
.customer-navigation a > svg { flex: 0 0 20px; }
.customer-navigation a > span:not(.customer-nav-tooltip) { flex: 1; font-size: 13px; }
.customer-nav-chevron { color: #e5c25b; margin-left: auto; }
.collapsed .customer-sidebar-head { justify-content: center; flex-wrap: wrap; }
.collapsed .customer-brand { font-size: 18px; margin-left: 0; }
.collapsed .customer-nav-toggle { flex-basis: 38px; }
.collapsed .customer-navigation a { justify-content: center; padding: 10px 6px; }
.customer-nav-tooltip { background: #17252a; border-radius: 4px; box-shadow: 0 5px 16px #0003; color: #fff; font-size: 12px; left: calc(100% + 12px); opacity: 0; padding: 8px 11px; pointer-events: none; position: absolute; top: 50%; transform: translateY(-50%); visibility: hidden; white-space: nowrap; z-index: 10; }
.customer-navigation a:hover .customer-nav-tooltip, .customer-navigation a:focus-visible .customer-nav-tooltip { opacity: 1; visibility: visible; }
.customer-sidebar-profile { align-items: center; border-top: 1px solid #3a625a; display: flex; gap: 10px; margin-top: auto; padding: 18px 4px 0; }
.customer-profile-copy { display: grid; flex: 1; gap: 3px; min-width: 0; }
.customer-profile-copy strong { font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.customer-profile-copy span { color: #9db8ad; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.customer-sign-out { align-items: center; background: transparent; color: #dce9e2; display: inline-flex; gap: 6px; justify-content: center; min-height: 38px; padding: 8px; }
.customer-sign-out:hover { background: #28534a; }
.customer-sign-out span { font-size: 12px; }
.customer-main-wrap { min-width: 0; }
.customer-topbar { align-items: center; background: #fff; border-bottom: 1px solid #cbd7d0; display: flex; justify-content: space-between; min-height: 68px; padding: 10px clamp(18px, 4vw, 48px); }
.customer-topbar .eyebrow { margin-bottom: 3px; }
.customer-topbar > div:first-child { display: flex; flex-direction: column; gap: 0; }
.customer-topbar > div:first-child strong { color: #173c36; font-size: 14px; }
.customer-topbar-account { align-items: center; color: #49675a; display: flex; font-size: 12px; gap: 7px; }
.customer-main { min-width: 0; padding: 30px clamp(18px, 4vw, 48px) 48px; }
.customer-backdrop { background: #17252a70; border-radius: 0; inset: 0; padding: 0; position: absolute; z-index: 1; }
.customer-backdrop:hover { background: #17252a70; }
.customer-navigation a:focus-visible, .customer-nav-toggle:focus-visible, .customer-sign-out:focus-visible { outline: 2px solid #e5c25b; outline-offset: 3px; }
@media (max-width: 720px) {
	.customer-shell, .customer-shell-collapsed { grid-template-columns: 58px minmax(0, 1fr); }
	.customer-sidebar { padding: 12px 6px; }
	.customer-sidebar:not(.collapsed) { inset: 0 auto 0 0; position: absolute; width: min(264px, calc(100vw - 58px)); z-index: 3; box-shadow: 8px 0 24px #173c3630; }
	.customer-sidebar-head { justify-content: center; flex-wrap: wrap; }
	.customer-brand { font-size: 14px; margin-left: 0; }
	.customer-shell-collapsed .customer-brand { font-size: 0; }
	.customer-shell-collapsed .customer-brand::before { content: "x"; font-size: 17px; }
	.customer-shell-collapsed .customer-brand span { font-size: 10px; }
	.customer-sidebar-label { display: none; }
	.customer-navigation a { justify-content: center; padding: 10px 6px; }
	.customer-main-wrap { grid-column: 2; }
	.customer-topbar { min-height: 58px; padding: 8px 12px; }
	.customer-topbar-account span { max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.customer-main { padding: 22px 12px 36px; }
}
</style>