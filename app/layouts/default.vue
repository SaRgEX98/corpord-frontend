<template>
  <div class="app-shell">
    <LayoutSidebar />
    <div class="app-main">
      <LayoutNavbar />
      <main id="main-content"><slot /></main>
      <LayoutFooter />
    </div>
  </div>
</template>
<style scoped>
.app-shell {
  display: flex;
  min-height: 100dvh;
}
.app-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.app-main > main {
  flex: 1;
}
</style>
