import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import { customerSession } from "../../features/customer-portal/session";
import { staffSession } from "../../features/auth/session";

declare module "vue-router" {
  interface RouteMeta { permission?: "customers:read" | "customers:manage"; customer?: boolean }
}

const routes: RouteRecordRaw[] = [
  { path: "/login", name: "staff.login", component: () => import("../../features/auth/StaffLogin.vue") },
  { path: "/customer/register", name: "customer.register", component: () => import("../../features/customer-portal/CustomerRegistration.vue") },
  { path: "/customer/login", name: "customer.login", component: () => import("../../features/customer-portal/CustomerLogin.vue") },
  { path: "/customer", component: () => import("../layouts/CustomerLayout.vue"), children: [{ path: "", name: "customer.portal", component: () => import("../../features/customer-portal/CustomerPortal.vue"), meta: { customer: true } }] },
  {
    path: "/", component: () => import("../layouts/AppLayout.vue"), children: [
      { path: "", redirect: { name: "customers.list" } },
      { path: "clientes", name: "customers.list", component: () => import("../../features/customers/views/CustomerListView.vue"), meta: { permission: "customers:read" } },
      { path: "clientes/nuevo", name: "customers.create", component: () => import("../../features/customers/views/CustomerCreateView.vue"), meta: { permission: "customers:manage" } },
      { path: "clientes/:id/editar", name: "customers.edit", component: () => import("../../features/customers/views/CustomerEditView.vue"), meta: { permission: "customers:manage" } },
      { path: "clientes/:id", component: () => import("../../features/customers/views/CustomerDetailView.vue"), meta: { permission: "customers:read" }, redirect: { name: "customers.detail.general" }, children: [
        { path: "general", name: "customers.detail.general", component: () => import("../../features/customers/views/tabs/CustomerGeneralTab.vue") },
        { path: "facturacion", name: "customers.detail.billing", component: () => import("../../features/customers/views/tabs/CustomerBillingTab.vue") },
        { path: "reparaciones", name: "customers.detail.repairs", component: () => import("../../features/customers/views/tabs/CustomerRepairsTab.vue") },
        { path: "notas", name: "customers.detail.notes", component: () => import("../../features/customers/views/tabs/CustomerNotesTab.vue") }
      ] }
    ]
  }
];

const router = createRouter({ history: createWebHistory(), routes });
router.beforeEach((to) => {
  if (to.meta.customer) return customerSession.value ? true : { name: "customer.login" };
  if (!to.meta.permission) return true;
  if (!staffSession.value) return { name: "staff.login", query: { redirect: to.fullPath } };
  const role = staffSession.value.user.role;
  const canManage = role === "admin";
  return to.meta.permission === "customers:read" || canManage ? true : { name: "customers.list" };
});
export default router;