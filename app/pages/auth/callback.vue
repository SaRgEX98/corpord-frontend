<script setup lang="ts">
definePageMeta({ layout: "auth", middleware: "auth-callback" });
useHead({ title: "Выполняем вход" });
</script>
<template><TransportDataState pending /></template>
