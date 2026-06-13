import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/MainLayout.vue'),
      children: [
        { path: '', name: 'home', component: () => import('@/views/HomeView.vue') },
        { path: 'matches', name: 'matches', component: () => import('@/views/MatchesView.vue') },
        { path: 'matches/:id', name: 'match-detail', component: () => import('@/views/MatchDetailView.vue') },
        { path: 'fields', name: 'fields', component: () => import('@/views/FieldsView.vue') },
        { path: 'fields/new', name: 'field-create', component: () => import('@/views/FieldCreateView.vue'), meta: { requiresAuth: true } },
        { path: 'matches/new', name: 'match-create', component: () => import('@/views/MatchCreateView.vue'), meta: { requiresAuth: true } },
        { path: 'map', name: 'map', component: () => import('@/views/MapView.vue') },
        { path: 'ranking', name: 'ranking', component: () => import('@/views/RankingView.vue') },
        { path: 'players/:id', name: 'player-profile', component: () => import('@/views/PlayerProfileView.vue') },
        { path: 'contacts', name: 'contacts', component: () => import('@/views/ContactsView.vue'), meta: { requiresAuth: true } },
        { path: 'profile', name: 'profile', component: () => import('@/views/ProfileView.vue'), meta: { requiresAuth: true } },
        { path: 'dashboard', name: 'dashboard', component: () => import('@/views/DashboardView.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
        { path: 'admin/users', name: 'admin-users', component: () => import('@/views/admin/UsersView.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
        { path: 'admin/fields', name: 'admin-fields', component: () => import('@/views/admin/FieldsAdminView.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
        { path: 'admin/matches', name: 'admin-matches', component: () => import('@/views/admin/MatchesAdminView.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
        { path: 'admin/payments', name: 'admin-payments', component: () => import('@/views/admin/PaymentsView.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
        { path: 'admin/settings', name: 'admin-settings', component: () => import('@/views/admin/SettingsAdminView.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
        { path: 'admin/staff', name: 'admin-staff', component: () => import('@/views/admin/StaffAdminView.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
        { path: 'notifications', name: 'notifications', component: () => import('@/views/NotificationsView.vue'), meta: { requiresAuth: true } }
      ]
    },
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { guest: true } },
    { path: '/register', name: 'register', component: () => import('@/views/RegisterView.vue'), meta: { guest: true } },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue') }
  ],
  scrollBehavior: () => ({ top: 0 })
})

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return next({ name: 'login', query: { redirect: to.fullPath } })
  }

  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return next({ name: 'home' })
  }

  if (to.meta.guest && auth.isAuthenticated) {
    return next({ name: 'home' })
  }

  next()
})

export default router
