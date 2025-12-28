<script setup lang="ts">
const auth = useAuth();
await auth.logout();
await navigateTo('/login')
</script>

<template>

</template>

<style scoped>

</style>