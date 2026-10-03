<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { customerSession } from "../../customer-portal/session";
import { cartLines, cartTotalCents, clearCart } from "../cart";
import AddressFields, { type AddressFieldsValue } from "../../admin/views/AddressFields.vue";
import { getCustomerBillingProfile, placeShopOrder, type ShippingAddress } from "../api";

const router = useRouter();
const form = ref<ShippingAddress>({ street: "", postalCode: "", city: "", province: "", country: "España" });
const profile = ref<Awaited<ReturnType<typeof getCustomerBillingProfile>> | null>(null);
const billingAddress = ref<AddressFieldsValue>({ addressStreet: "", addressPostalCode: "", addressCity: "", addressProvince: "", addressCountry: "" });
const contactAddress = ref<AddressFieldsValue>({ addressStreet: "", addressPostalCode: "", addressCity: "", addressProvince: "", addressCountry: "" });
const billingName = ref("");
const billingTaxId = ref("");
const customerType = ref<"" | "individual" | "business">("");
const useContactAddressForBilling = ref(false);
const saving = ref(false);
const profileLoading = ref(true);
const error = ref("");
const orderId = ref("");
const money = (cents: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);

onMounted(async () => {
  if (!customerSession.value) { profileLoading.value = false; void router.replace({ name: "customer.login", query: { redirect: "/shop/checkout" } }); }
  else {
    try {
      profile.value = await getCustomerBillingProfile(customerSession.value.accessToken);
      const customer = profile.value;
      contactAddress.value = { addressStreet: customer.addressStreet ?? "", addressPostalCode: customer.addressPostalCode ?? "", addressCity: customer.addressCity ?? "", addressProvince: customer.addressProvince ?? "", addressCountry: customer.addressCountry ?? "" };
      billingAddress.value = { addressStreet: customer.billingAddressStreet ?? "", addressPostalCode: customer.billingAddressPostalCode ?? "", addressCity: customer.billingAddressCity ?? "", addressProvince: customer.billingAddressProvince ?? "", addressCountry: customer.billingAddressCountry ?? "" };
      billingName.value = customer.billingName ?? customer.displayName;
      billingTaxId.value = customer.billingTaxId ?? customer.taxId ?? "";
      customerType.value = customer.customerType ?? "";
      const hasContactAddress = [contactAddress.value.addressStreet, contactAddress.value.addressPostalCode, contactAddress.value.addressCity, contactAddress.value.addressProvince].some(Boolean);
      const hasBillingAddress = Object.values(billingAddress.value).some(Boolean);
      const addressesMatch = Object.keys(contactAddress.value).every((key) => contactAddress.value[key as keyof AddressFieldsValue] === billingAddress.value[key as keyof AddressFieldsValue]);
      useContactAddressForBilling.value = hasContactAddress && (!hasBillingAddress || addressesMatch);
    } catch (reason) {
      error.value = (reason as Error).message;
    } finally {
      profileLoading.value = false;
    }
  }
});

async function submit(): Promise<void> {
  if (!customerSession.value || !cartLines.value.length) return;
  saving.value = true;
  error.value = "";
  try {
    const order = await placeShopOrder(customerSession.value.accessToken, {
      lines: cartLines.value.map(({ productId, quantity }) => ({ productId, quantity })),
      shippingAddress: form.value,
      customerType: customerType.value || undefined,
      billingName: billingName.value || undefined,
      billingTaxId: billingTaxId.value || undefined,
      useContactAddressForBilling: useContactAddressForBilling.value,
      ...(useContactAddressForBilling.value ? {} : {
        billingAddressStreet: billingAddress.value.addressStreet || undefined,
        billingAddressPostalCode: billingAddress.value.addressPostalCode || undefined,
        billingAddressCity: billingAddress.value.addressCity || undefined,
        billingAddressProvince: billingAddress.value.addressProvince || undefined,
        billingAddressCountry: billingAddress.value.addressCountry || undefined
      })
    });
    orderId.value = order.id;
    clearCart();
  } catch (reason) {
    error.value = (reason as Error).message;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <main class="shop-page"><header class="shop-header"><RouterLink class="shop-brand" :to="{ name: 'shop.catalog' }">xTech<span>JS</span> tienda</RouterLink><div class="shop-actions"><RouterLink :to="{ name: 'shop.cart' }">Carrito</RouterLink></div></header>
    <section class="shop-checkout"><p class="eyebrow">Checkout</p><h1>{{ orderId ? "Pedido registrado" : "Entrega y facturación" }}</h1>
      <p v-if="orderId" class="feedback success">Tu pedido {{ orderId.slice(0, 8) }} se ha registrado y queda pendiente de pago manual. Recibirás las instrucciones a través del laboratorio.</p>
      <p v-else-if="!cartLines.length" class="empty">No hay productos en tu carrito. <RouterLink :to="{ name: 'shop.catalog' }">Volver al catálogo</RouterLink></p>
      <form v-else class="shop-checkout-form" @submit.prevent="submit"><div class="shop-checkout-layout"><div class="shop-checkout-fields"><fieldset><legend>Entrega</legend><label>Dirección<input v-model="form.street" required maxlength="240" autocomplete="street-address" /></label><div class="shop-address-row"><label>Código postal<input v-model="form.postalCode" required maxlength="20" autocomplete="postal-code" /></label><label>Localidad<input v-model="form.city" required maxlength="120" autocomplete="address-level2" /></label></div><label>Provincia<input v-model="form.province" required maxlength="120" autocomplete="address-level1" /></label><label>País<input v-model="form.country" required maxlength="120" autocomplete="country-name" /></label></fieldset><fieldset><legend>Datos de facturación</legend><label>Tipo de cliente<select v-model="customerType"><option value="">Sin especificar</option><option value="individual">Particular</option><option value="business">Empresa</option></select></label><label>Nombre o razón social<input v-model="billingName" maxlength="160" /></label><label>NIF/CIF<input v-model="billingTaxId" maxlength="64" /></label><label v-if="contactAddress.addressStreet || contactAddress.addressCity" class="checkbox-row"><input v-model="useContactAddressForBilling" type="checkbox" /><span>Usar la dirección de contacto guardada para facturación</span></label><AddressFields v-if="!useContactAddressForBilling" v-model="billingAddress" legend="Dirección fiscal" public-catalog /></fieldset></div><aside class="shop-cart-summary"><p class="eyebrow">Total</p><strong>{{ money(cartTotalCents) }}</strong><span>{{ cartLines.length }} líneas de pedido</span><button :disabled="saving || profileLoading">{{ profileLoading ? "Cargando ficha" : saving ? "Registrando pedido" : "Confirmar pedido" }}</button></aside></div><p v-if="error" class="feedback error">{{ error }}</p></form>
    </section>
  </main>
</template>
