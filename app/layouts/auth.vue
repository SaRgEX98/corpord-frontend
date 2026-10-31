<script setup lang="ts">
import { ArrowLeft, ArrowUpRight, Route } from "lucide-vue-next";
</script>
<template>
  <div class="auth-layout">
    <aside class="auth-story">
      <BrandLogo />
      <div class="auth-story-main">
        <span class="story-eyebrow">CORPORD · В ДВИЖЕНИИ</span>
        <h2>Хорошие поездки<br />начинаются<br /><span>здесь.</span></h2>
        <p>
          Ваши маршруты, расписание и транспорт.<br />В одном месте, в вашем
          ритме.
        </p>
        <div class="story-route">
          <div><span></span><span></span><span></span><Route :size="29" /></div>
          <span>Навстречу новым местам <ArrowUpRight :size="15" /></span>
        </div>
      </div>
      <span class="auth-story-footer"
        >© {{ new Date().getFullYear() }} Corpord · На пути к новым
        местам</span
      >
    </aside>
    <div class="auth-form-side">
      <header>
        <NuxtLink to="/trips" class="auth-back"
          ><ArrowLeft :size="15" />К расписанию</NuxtLink
        ><ThemePicker compact />
      </header>
      <main id="main-content" class="auth-form-main">
        <div>
          <div class="mobile-brand"><BrandLogo /></div>
          <slot />
        </div>
      </main>
      <footer>Планируйте поездки. Открывайте новые направления.</footer>
    </div>
  </div>
</template>
<style scoped>
.auth-layout {
  min-height: 100dvh;
  display: grid;
  grid-template-columns: 43% 57%;
  background: var(--card);
}
.auth-story {
  display: flex;
  flex-direction: column;
  padding: 43px 45px;
  background: #101f35;
  color: #fff;
  overflow: hidden;
  position: relative;
}
.auth-story:after {
  content: "";
  width: 500px;
  height: 500px;
  border-radius: 50%;
  border: 1px solid #ffffff08;
  position: absolute;
  right: -300px;
  bottom: 30px;
  box-shadow:
    0 0 0 100px #ffffff02,
    0 0 0 200px #ffffff01;
  pointer-events: none;
}
.auth-story-main {
  margin: auto 0;
  padding: 70px 0;
  position: relative;
  z-index: 1;
}
.story-eyebrow {
  font-size: 9px;
  color: #899bb6;
  letter-spacing: 0.15em;
}
.auth-story h2 {
  font-size: clamp(35px, 4vw, 63px);
  font-weight: 650;
  line-height: 1.14;
  letter-spacing: -0.05em;
  margin-top: 24px;
}
.auth-story h2 > span {
  color: #b9ec83;
}
.auth-story-main > p {
  font-size: 12px;
  color: #95a6be;
  line-height: 1.9;
  margin-top: 27px;
}
.story-route {
  max-width: 280px;
  margin-top: 55px;
}
.story-route > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  color: #b9ec83;
}
.story-route > div:before {
  content: "";
  position: absolute;
  left: 0;
  right: 5px;
  top: 50%;
  height: 1px;
  background: #4d6178;
}
.story-route > div > span {
  height: 8px;
  width: 8px;
  border-radius: 50%;
  border: 2px solid #9dadc2;
  background: #101f35;
  position: relative;
}
.story-route > div > svg {
  position: relative;
  background: #101f35;
}
.story-route > span {
  display: flex;
  justify-content: space-between;
  color: #95a6be;
  font-size: 9px;
  margin-top: 17px;
  align-items: center;
}
.auth-story-footer {
  font-size: 9px;
  color: #70839e;
  position: relative;
  z-index: 1;
}
.auth-form-side {
  display: flex;
  flex-direction: column;
  padding: 30px 38px;
}
.auth-form-side > header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
}
.auth-back {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted-foreground);
  font-size: 11px;
}
.auth-form-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 50px 0;
}
.auth-form-main > div {
  width: 100%;
  max-width: 350px;
}
.auth-form-side > footer {
  font-size: 9px;
  color: var(--muted-foreground);
  text-align: center;
}
.mobile-brand {
  display: none;
}
@media (max-width: 850px) {
  .auth-layout {
    grid-template-columns: 36% 64%;
  }
  .auth-story {
    padding: 35px 25px;
  }
  .auth-story h2 {
    font-size: 35px;
  }
  .auth-form-side {
    padding: 25px;
  }
  .auth-story-main > p {
    font-size: 10px;
  }
  .story-route {
    margin-top: 35px;
  }
  .auth-story-footer {
    font-size: 8px;
  }
}
@media (max-width: 600px) {
  .auth-layout {
    display: block;
  }
  .auth-story {
    display: none;
  }
  .auth-form-side {
    min-height: 100dvh;
    padding: 20px;
  }
  .auth-form-main {
    padding: 45px 0;
  }
  .mobile-brand {
    display: block;
    margin-bottom: 38px;
  }
  .auth-form-side > footer {
    padding-bottom: 5px;
  }
}
</style>
