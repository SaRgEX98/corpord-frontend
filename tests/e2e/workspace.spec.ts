import { expect, test, type Page } from "@playwright/test";

test.skip(
  !process.env.CORPORD_E2E_ADMIN_EMAIL,
  "Use npm run test:e2e:isolated, or supply credentials for a dedicated test database.",
);

async function login(page: Page) {
  await page.goto("/login");
  await page
    .locator("input[type=email]")
    .fill(process.env.CORPORD_E2E_ADMIN_EMAIL!);
  await page
    .locator("input[type=password]")
    .fill(process.env.CORPORD_E2E_ADMIN_PASSWORD!);
  await page
    .getByRole("button", { name: "Войти в аккаунт", exact: true })
    .click();
  await expect(page).not.toHaveURL(/\/login/);
}

test("all nine resources support create, detail, update and delete against the real API", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);
  const suffix = Date.now().toString(36);
  const created: { slug: string; id: string }[] = [];
  const cases = [
    { slug: "bus-categories", fields: { name: `E2E category ${suffix}` } },
    { slug: "bus-statuses", fields: { name: `E2E bus status ${suffix}` } },
    {
      slug: "driver-statuses",
      fields: { name: `E2E driver status ${suffix}` },
    },
    {
      slug: "buses",
      fields: {
        license_plate: `TEST-${suffix}`,
        brand: "E2E Bus",
        capacity: "48",
        category_id: "@bus-categories",
        status_id: "@bus-statuses",
      },
    },
    {
      slug: "drivers",
      fields: {
        first_name: "Тест",
        last_name: "Водитель",
        middle_name: "",
        phone_number: "+79990000000",
        status: "@driver-statuses",
      },
    },
    {
      slug: "stops",
      fields: {
        name: `E2E stop ${suffix}`,
        address: "Тестовая улица, 1",
        latitude: "0",
        longitude: "0",
      },
    },
    {
      slug: "trips",
      fields: {
        bus_id: "@buses",
        driver_id: "@drivers",
        start_time: "2030-06-01T10:00",
        end_time: "2030-06-01T12:00",
        status: "scheduled",
        base_price: "0",
      },
    },
    {
      slug: "trip-stops",
      fields: {
        trip_id: "@trips",
        stop_id: "@stops",
        arrival_time: "2030-06-01T10:00",
        departure_time: "2030-06-01T10:05",
        stop_order: "1",
        price_to_next: "0",
      },
    },
    {
      slug: "users",
      fields: {
        name: `E2E User ${suffix}`,
        email: `user-${suffix}@example.test`,
        password: " spaced test password ",
      },
    },
  ];
  for (const resource of cases) {
    await page.goto(`/admin/${resource.slug}`);
    console.log(`CRUD ${resource.slug}`);
    await expect(page.locator('[aria-label="Список записей"]')).toHaveAttribute(
      "aria-busy",
      "false",
    );
    const previousIDs = new Set(
      await page.locator("tbody tr td:first-child").allTextContents(),
    );
    await page.getByRole("button", { name: /^\+ Добавить/ }).click();
    for (const [key, raw] of Object.entries(resource.fields)) {
      const input = page.locator(`#admin-${key}`);
      const value = raw.startsWith("@")
        ? created.find((item) => item.slug === raw.slice(1))!.id
        : raw;
      if (await input.evaluate((element) => element.tagName === "SELECT"))
        await input.selectOption(value);
      else if (await input.getAttribute("role") === "combobox") {
        await input.click();
        await page.locator(`[role="option"][data-value="${value}"]`).click();
      } else await input.fill(value);
    }
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Запись создана." }),
    ).toBeVisible();
    await expect(page.locator('[aria-label="Список записей"]')).toHaveAttribute(
      "aria-busy",
      "false",
    );
    const allIDs = await page
      .locator("tbody tr td:first-child")
      .allTextContents();
    const insertedIDs = allIDs.filter((id) => !previousIDs.has(id));
    expect(insertedIDs).toHaveLength(1);
    const id = insertedIDs[0]!.trim();
    const row = page.locator("tbody tr").filter({
      has: page.locator("td:first-child", { hasText: new RegExp(`^${id}$`) }),
    });
    created.push({ slug: resource.slug, id });
    await row.getByRole("button", { name: /^Открыть/ }).click();
    await expect(
      page.getByRole("heading", { name: /^Карточка/ }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Редактировать", exact: true })
      .click();
    // Edit the fresh DTO while preserving relation IDs, zeroes, dates and optional passwords.
    const changedField =
      resource.slug === "buses"
        ? "brand"
        : resource.slug === "drivers"
          ? "first_name"
          : resource.slug === "stops"
            ? "address"
            : resource.slug === "trips"
              ? "base_price"
              : resource.slug === "trip-stops"
                ? "price_to_next"
                : "name";
    await page
      .locator(`#admin-${changedField}`)
      .fill(changedField.includes("price") ? "1" : `E2E updated ${suffix}`);
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Изменения сохранены." }),
    ).toBeVisible();
    await expect(page.locator('[aria-label="Список записей"]')).toHaveAttribute(
      "aria-busy",
      "false",
    );
    await row.getByRole("button", { name: /^Изменить/ }).click();
    await expect(page.locator(`#admin-${changedField}`)).toHaveValue(
      changedField.includes("price") ? "1" : `E2E updated ${suffix}`,
    );
    for (const [key, raw] of Object.entries(resource.fields)) {
      if (raw.startsWith("@"))
        await expect(page.locator(`#admin-${key}`)).toHaveAttribute("data-value",
          created.find((item) => item.slug === raw.slice(1))!.id,
        );
    }
    if (resource.slug === "users")
      await expect(page.locator("#admin-password")).toHaveValue("");
    await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  }
  await page.goto("/admin");
  await page.reload();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  for (const path of ["/buses", "/drivers", "/stops"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const details = page
      .getByRole("link", { name: /Подробнее|Открыть|Смотреть/ })
      .first();
    await expect(details).toBeVisible();
    await details.click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("[role=alert]")).toHaveCount(0);
  }
  const trip = created.find((item) => item.slug === "trips")!;
  await page.goto(`/trips/${trip.id}`);
  await expect(page.locator("main")).toContainText(`E2E stop ${suffix}`);
  await page.goto("/me/profile");
  await expect(page.locator("main")).toContainText(
    process.env.CORPORD_E2E_ADMIN_EMAIL!,
  );
  for (const resource of [...created].reverse()) {
    await page.goto(`/admin/${resource.slug}`);
    const row = page.locator("tbody tr").filter({
      has: page.locator("td:first-child", {
        hasText: new RegExp(`^${resource.id}$`),
      }),
    });
    await row.getByRole("button", { name: /^Удалить/ }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Удалить", exact: true })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "Запись удалена." }),
    ).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("public pages, theme persistence, mobile layout and ordinary-user access control", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.evaluate(() => localStorage.setItem("corpord-theme", "dark"));
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: "light" });
  await page.evaluate(() => localStorage.setItem("corpord-theme", "system"));
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of [
    "/",
    "/trips",
    "/buses",
    "/drivers",
    "/stops",
    "/login",
    "/register",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  const email = `public-${Date.now()}@example.test`;
  await page.goto("/register");
  await page.locator("#register-name").fill("E2E Ordinary User");
  await page.locator("#register-email").fill(email);
  await page.locator("#register-password").fill(" ordinary user password ");
  await page.getByRole("button", { name: /Создать аккаунт/ }).click();
  await expect(page).toHaveURL(/\/me\/profile$/);
  await expect(page.locator("main")).toContainText(email);
  await page.goto("/admin");
  await expect(page.locator("body")).toContainText(
    /403|Недостаточно прав|Доступ ограничен|Доступ запрещён/,
  );
  await page.goto("/me/settings");
  await page
    .getByRole("button", { name: "Выйти на всех устройствах", exact: true })
    .click();
  const revokeDialog = page.getByRole("alertdialog");
  await expect(revokeDialog.getByRole("button", {name:"Отмена",exact:true})).toBeFocused();
  const rect = await revokeDialog.boundingBox();
  const viewport = page.viewportSize()!;
  expect(Math.abs(rect!.x + rect!.width / 2 - viewport.width / 2)).toBeLessThan(2);
  expect(Math.abs(rect!.y + rect!.height / 2 - viewport.height / 2)).toBeLessThan(2);
  await revokeDialog.getByRole("button", {name:"Отмена",exact:true}).click();
  await expect(page.getByRole("button", {name:"Выйти на всех устройствах",exact:true})).toBeFocused();
  await page.getByRole("button", {name:"Выйти на всех устройствах",exact:true}).click();
  await page.route("**/auth/logout/all", async route => route.fulfill({status:503,json:{error:"Test unavailable"}}), {times:1});
  await revokeDialog.getByRole("button", {name:"Завершить сеансы",exact:true}).click();
  await expect(revokeDialog.getByRole("alert")).toContainText("Сервис временно недоступен");
  await expect(revokeDialog).toBeVisible();
  await revokeDialog.getByRole("button", { name: "Завершить сеансы", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/me/profile");
  await expect(page).toHaveURL(/\/login/);
  expect(errors).toEqual([]);
});
