import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./app/router";
import { installCorrelationFetch } from "./shared/http/correlation-fetch";
import "./styles.css";

installCorrelationFetch();
createApp(App).use(createPinia()).use(router).mount("#app");