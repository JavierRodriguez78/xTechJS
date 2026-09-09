import { createApp } from "vue";
import App from "./App.vue";
import { installCorrelationFetch } from "./shared/http/correlation-fetch";
import "./styles.css";

installCorrelationFetch();
createApp(App).mount("#app");