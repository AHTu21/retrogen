import type { ThemePack, WarmupOption } from "./types.js";
import { themeVisualSeed } from "./themeVariants.js";

function capitalize(s: string): string {
  if (!s) return s;
  return s[0].toUpperCase() + s.slice(1);
}

function warmupOptions(theme: string): WarmupOption[] {
  const t = capitalize(theme.trim());
  return [
    {
      id: "seeker",
      label: "Ищущий",
      hint: `в спринте искал важные решения и детали в духе «${t}»`,
    },
    {
      id: "chaser",
      label: "Охотник",
      hint: "двигал работу к цели",
    },
    {
      id: "beater",
      label: "Загонщик",
      hint: "отбивал проблемы и помогал команде",
    },
    {
      id: "keeper",
      label: "Вратарь",
      hint: "защищал команду от лишнего давления",
    },
  ];
}

function pickSubtitle(variant: number, options: string[]): string {
  return options[variant % options.length]!;
}

/** Каркас блоков с метафорами, завязанными на введённую тему */
export function buildThemePack(themeSanitized: string): ThemePack {
  const theme = themeSanitized.trim() || "ретро";
  const T = capitalize(theme);
  const vis = themeVisualSeed(theme);
  const sv = vis.subtitleVariant;

  return {
    seedTheme: theme,
    palette: {
      bg: "#0f1419",
      surface: "#1a2332",
      accent: vis.accent,
    },
    blocks: {
      warmup: {
        title: `Разминка: ${T}`,
        subtitle: pickSubtitle(sv, [
          "Выберите роль, которая лучше всего описывает ваш спринт.",
          "Какой образ ближе к тому, как вы прошли спринт в духе темы?",
          "Одна роль — чтобы разогнаться перед основной частью ретро.",
        ]),
        warmupOptions: warmupOptions(theme),
      },
      good: {
        title: pickSubtitle(sv >> 2, [
          `Что дало силы: ${T}`,
          `Сработало круто — ${T}`,
          `Плюсы спринта: ${T}`,
        ]),
        subtitle: pickSubtitle(sv >> 3, [
          "Что сработало хорошо, помогло команде, принесло успех",
          "Моменты, которыми можно гордиться и на которые стоит опереться",
          "Где команда проявила себя сильно или получила удовлетворение от результата",
        ]),
      },
      bad: {
        title: pickSubtitle(sv >> 4, [
          `Где убило настроение: ${T}`,
          `Тяжёлые места — ${T}`,
          `Что бесило и тормозило: ${T}`,
        ]),
        subtitle: pickSubtitle(sv >> 5, [
          "Что не получилось, где потеряли фокус или ресурс",
          "Трения, ошибки, упущенные сигналы — без обвинений, с фактами",
          "Где чувствовался дискомфорт или нехватка времени/ясности",
        ]),
      },
      improve: {
        title: pickSubtitle(sv >> 6, [
          `Новая заря: ${T}`,
          `Что попробуем дальше — ${T}`,
          `Улучшения на будущее: ${T}`,
        ]),
        subtitle: pickSubtitle(sv >> 7, [
          "Какие улучшения стоит попробовать, чтобы работать эффективнее",
          "Один-два эксперимента, которые реально обсудим и замерим",
          "Идеи, которые снизят риск повторения проблем",
        ]),
      },
      sprintStar: {
        title: pickSubtitle(sv >> 8, [
          `Звёздочка спринта: ${T}`,
          `Кого благодарим за спринт — ${T}`,
          `Выделяем людей: ${T}`,
        ]),
        subtitle: pickSubtitle(sv >> 9, [
          "Кого отметим в этом спринте (звёзды и короткий комментарий)",
          "Публичное «спасибо» тем, кто особенно помог пройти спринт",
          "Коротко: кто заслуживает звезды и почему",
        ]),
      },
      rateRetro: {
        title: pickSubtitle(sv >> 10, ["Оцените ретро", "Насколько была полезна встреча?", "Ваша оценка этого ретро"]),
        subtitle: pickSubtitle(sv >> 11, [
          "По шкале от 1 до 5 — насколько встреча была полезной",
          "От 1 до 5: польза формата, темп, итоги для команды",
          "Шкала 1–5: насколько это ретро того стоило по времени",
        ]),
        rateScale: 5,
      },
      oneThingNextRetro: {
        title: pickSubtitle(sv >> 12, [
          "Что могло бы улучшить ретро?",
          "Одна вещь, чтобы следующее ретро прошло лучше",
          "Чего не хватило на этой встрече?",
        ]),
      },
    },
  };
}
