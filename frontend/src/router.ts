import { createRouter, createWebHistory } from 'vue-router'
import { isAuthenticated } from './lib/session'
import AppShell from './components/AppShell.vue'
import LoginView from './views/LoginView.vue'
import OrganizationView from './views/OrganizationView.vue'
import KeysQuotaView from './views/KeysQuotaView.vue'
import LogsView from './views/LogsView.vue'
import AlertsView from './views/AlertsView.vue'
import ChannelsView from './views/ChannelsView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: LoginView, meta: { public: true } },
    {
      path: '/', component: AppShell,
      children: [
        { path: '', redirect: '/organization' },
        { path: 'organization', component: OrganizationView },
        { path: 'keys-quota', component: KeysQuotaView },
        { path: 'logs', component: LogsView },
        { path: 'alerts', component: AlertsView },
        { path: 'channels', component: ChannelsView },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach((to) => {
  if (!to.meta.public && !isAuthenticated()) return '/login'
  if (to.path === '/login' && isAuthenticated()) return '/organization'
})

window.addEventListener('aigate:unauthorized', () => router.replace('/login'))
