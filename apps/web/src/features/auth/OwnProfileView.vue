<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { onBeforeRouteLeave, useRouter } from "vue-router";
import { Eye, EyeOff, KeyRound, RefreshCw, Save } from "@lucide/vue";
import { getOwnProfile, updateOwnCredentials, OwnProfileRequestError, type OwnProfile, type ProfileFieldErrors } from "./profile";
import { setStaffSession, signOut, staffSession } from "./session";

const router = useRouter();
const profile = ref<OwnProfile | null>(null);
const loading = ref(true);
const loadError = ref("");
const saving = ref<"email" | "password" | null>(null);
const email = ref("");
const emailElement = ref<HTMLInputElement | null>(null);
const emailPassword = ref("");
const emailErrors = ref<ProfileFieldErrors>({});
const emailMessage = ref("");
const emailSuccess = ref("");
const passwordForm = ref({ currentPassword: "", newPassword: "", confirmation: "" });
const passwordErrors = ref<ProfileFieldErrors & { confirmation?: string }>({});
const passwordMessage = ref("");
const showEmailPassword = ref(false);
const showPasswords = ref({ currentPassword: false, newPassword: false, confirmation: false });
const passwordFields = [
  { key: "currentPassword", label: "Contrasena actual", autocomplete: "current-password" },
  { key: "newPassword", label: "Nueva contrasena", autocomplete: "new-password" },
  { key: "confirmation", label: "Confirmar nueva contrasena", autocomplete: "new-password" }
] as const;
let alive = true;
const dirty = computed(() => email.value !== (profile.value?.email ?? "") || Boolean(emailPassword.value) || Object.values(passwordForm.value).some(Boolean));
onBeforeRouteLeave(() => !staffSession.value || !dirty.value || window.confirm("Hay cambios sin guardar en tu perfil. Quieres salir?"));

async function requireLogin(): Promise<void> { signOut(); await router.replace({ name: "staff.login" }); }
async function load(): Promise<void> {
  loading.value = true;
  loadError.value = "";
  try {
    const result = await getOwnProfile();
    if (alive) { profile.value = result; email.value = result.email; }
  } catch (error) {
    if (!alive) return;
    if (error instanceof OwnProfileRequestError && error.status === 401) await requireLogin();
    else loadError.value = (error as Error).message;
  } finally { if (alive) loading.value = false; }
}
function validateEmail(): void {
  delete emailErrors.value.email;
  if (!email.value.trim() || emailElement.value?.validity.typeMismatch) emailErrors.value.email = "Introduce un email valido.";
}
function validatePasswordField(field: keyof typeof passwordForm.value): void {
  delete passwordErrors.value[field];
  const value = passwordForm.value[field];
  if (field === "currentPassword" && !value) passwordErrors.value[field] = "Introduce tu contrasena actual.";
  if (field === "newPassword" && (value.length < 12 || new TextEncoder().encode(value).length > 72)) passwordErrors.value[field] = "Usa al menos 12 caracteres y como maximo 72 bytes.";
  if (field === "confirmation" && (!value || value !== passwordForm.value.newPassword)) passwordErrors.value[field] = "Las contrasenas no coinciden.";
}
async function saveEmail(): Promise<void> {
  if (saving.value) return;
  emailErrors.value = {};
  emailMessage.value = "";
  emailSuccess.value = "";
  validateEmail();
  if (!emailPassword.value) emailErrors.value.currentPassword = "Introduce tu contrasena actual.";
  if (Object.keys(emailErrors.value).length) return;
  const token = staffSession.value?.accessToken;
  saving.value = "email";
  try {
    const session = await updateOwnCredentials({ email: email.value.trim(), currentPassword: emailPassword.value });
    if (!alive || staffSession.value?.accessToken !== token) return;
    setStaffSession(session);
    profile.value = { ...session.user, active: true };
    email.value = session.user.email;
    emailPassword.value = "";
    showEmailPassword.value = false;
    emailSuccess.value = "Email actualizado.";
  } catch (error) {
    if (!alive || staffSession.value?.accessToken !== token) return;
    if (error instanceof OwnProfileRequestError) {
      emailErrors.value = error.fieldErrors;
      if (error.status === 401) { await requireLogin(); return; }
    }
    emailMessage.value = (error as Error).message;
  } finally { saving.value = null; }
}
async function savePassword(): Promise<void> {
  if (saving.value) return;
  passwordErrors.value = {};
  passwordMessage.value = "";
  for (const field of passwordFields) validatePasswordField(field.key);
  if (Object.keys(passwordErrors.value).length) return;
  const token = staffSession.value?.accessToken;
  saving.value = "password";
  try {
    await updateOwnCredentials({ currentPassword: passwordForm.value.currentPassword, newPassword: passwordForm.value.newPassword });
    if (!alive || staffSession.value?.accessToken !== token) return;
    passwordForm.value = { currentPassword: "", newPassword: "", confirmation: "" };
    emailPassword.value = "";
    signOut();
    await router.replace({ name: "staff.login", query: { passwordChanged: "1" } });
  } catch (error) {
    if (!alive || staffSession.value?.accessToken !== token) return;
    if (error instanceof OwnProfileRequestError) {
      passwordErrors.value = error.fieldErrors;
      if (error.status === 401) { await requireLogin(); return; }
    }
    passwordMessage.value = (error as Error).message;
  } finally { saving.value = null; }
}
onMounted(load);
onUnmounted(() => { alive = false; emailPassword.value = ""; passwordForm.value = { currentPassword: "", newPassword: "", confirmation: "" }; });
</script>

<template>
  <section class="own-profile">
    <p class="breadcrumb"><RouterLink :to="staffSession?.user.role === 'admin' ? { name: 'admin.dashboard' } : { name: 'customers.list' }">Inicio</RouterLink> / Mi perfil</p>
    <header><h1>Mi perfil</h1></header>
    <div v-if="loading" class="skeleton-row" aria-label="Cargando perfil" />
    <div v-else-if="loadError" class="load-error"><p class="feedback error" role="alert">{{ loadError }}</p><button class="secondary" type="button" @click="load"><RefreshCw :size="16" aria-hidden="true" />Reintentar</button></div>
    <template v-else-if="profile">
      <dl class="profile-identity"><div><dt>Nombre</dt><dd>{{ profile.displayName }}</dd></div><div><dt>Rol</dt><dd>{{ profile.role === 'admin' ? 'Administrador' : 'Empleado' }}</dd></div></dl>
      <div class="credential-sections">
        <form id="email-form" class="entity-form credential-form" @submit.prevent="saveEmail">
          <fieldset :disabled="Boolean(saving)"><legend>Email de acceso</legend>
            <label>Nuevo email<input ref="emailElement" v-model="email" type="email" required maxlength="320" autocomplete="email" aria-label="Nuevo email" :aria-invalid="Boolean(emailErrors.email)" :aria-describedby="emailErrors.email ? 'email-error' : undefined" @blur="validateEmail" /><span v-if="emailErrors.email" id="email-error" class="field-error">{{ emailErrors.email }}</span></label>
            <label>Contrasena actual<span class="password-input"><input v-model="emailPassword" :type="showEmailPassword ? 'text' : 'password'" required maxlength="256" autocomplete="current-password" aria-label="Contrasena actual para email" :aria-invalid="Boolean(emailErrors.currentPassword)" :aria-describedby="emailErrors.currentPassword ? 'email-password-error' : undefined" /><button type="button" :aria-label="showEmailPassword ? 'Ocultar contrasena actual para email' : 'Mostrar contrasena actual para email'" :title="showEmailPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'" @click="showEmailPassword = !showEmailPassword"><component :is="showEmailPassword ? EyeOff : Eye" :size="18" aria-hidden="true" /></button></span><span v-if="emailErrors.currentPassword" id="email-password-error" class="field-error">{{ emailErrors.currentPassword }}</span></label>
          </fieldset>
          <p v-if="emailMessage" class="feedback error" role="alert">{{ emailMessage }}</p><p v-if="emailSuccess" class="feedback success" role="status">{{ emailSuccess }}</p>
          <footer><button type="submit" :disabled="Boolean(saving)"><Save :size="16" aria-hidden="true" />{{ saving === 'email' ? 'Guardando...' : 'Actualizar email' }}</button></footer>
        </form>
        <form id="password-form" class="entity-form credential-form" @submit.prevent="savePassword">
          <fieldset :disabled="Boolean(saving)"><legend>Contrasena</legend>
            <label v-for="field in passwordFields" :key="field.key">{{ field.label }}<span class="password-input"><input v-model="passwordForm[field.key]" :type="showPasswords[field.key] ? 'text' : 'password'" :autocomplete="field.autocomplete" required :minlength="field.key === 'newPassword' ? 12 : undefined" :maxlength="field.key === 'currentPassword' ? 256 : 72" :aria-label="field.label" :aria-invalid="Boolean(passwordErrors[field.key])" :aria-describedby="passwordErrors[field.key] ? `${field.key}-error` : undefined" @blur="validatePasswordField(field.key)" /><button type="button" :aria-label="`${showPasswords[field.key] ? 'Ocultar' : 'Mostrar'} ${field.label.toLowerCase()}`" :title="showPasswords[field.key] ? 'Ocultar contrasena' : 'Mostrar contrasena'" @click="showPasswords[field.key] = !showPasswords[field.key]"><component :is="showPasswords[field.key] ? EyeOff : Eye" :size="18" aria-hidden="true" /></button></span><span v-if="passwordErrors[field.key]" :id="`${field.key}-error`" class="field-error">{{ passwordErrors[field.key] }}</span></label>
          </fieldset>
          <p v-if="passwordMessage" class="feedback error" role="alert">{{ passwordMessage }}</p>
          <footer><button type="submit" :disabled="Boolean(saving)"><KeyRound :size="16" aria-hidden="true" />{{ saving === 'password' ? 'Guardando...' : 'Cambiar contrasena' }}</button></footer>
        </form>
      </div>
    </template>
  </section>
</template>

<style scoped>
.own-profile { max-width: 1000px; }
header { margin: 20px 0 28px; }
h1 { font-size: 30px; }
.profile-identity { display: flex; flex-wrap: wrap; gap: 24px 64px; margin: 0 0 32px; }
.profile-identity dt { color: #698078; font-size: 12px; margin-bottom: 6px; }
.profile-identity dd { margin: 0; font-size: 15px; font-weight: 700; overflow-wrap: anywhere; }
.credential-sections { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 32px; align-items: start; }
.credential-form { max-width: none; width: 100%; margin: 0; gap: 16px; min-width: 0; }
.credential-form fieldset { margin: 0; min-width: 0; }
.credential-form input, .credential-form label { min-width: 0; }
.credential-form fieldset:disabled { opacity: .7; }
.password-input { display: flex; align-items: center; border: 1px solid #b5c9bd; border-radius: 4px; background: #fff; min-width: 0; }
.credential-form .password-input input { flex: 1; width: 0; border: 0; background: transparent; }
.password-input button { display: flex; align-items: center; justify-content: center; flex: 0 0 40px; width: 40px; height: 40px; padding: 0; background: transparent; color: #49675a; }
.password-input button:hover { background: #edf3ef; }
.field-error { color: #a33424; font-size: 12px; overflow-wrap: anywhere; }
footer button, .load-error button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
.load-error { display: grid; justify-items: start; gap: 16px; }
@media (max-width: 1000px) { .credential-sections { grid-template-columns: 1fr; } }
</style>