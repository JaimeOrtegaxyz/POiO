# POiO — voice, copy and sound

How POiO talks: on-screen text and a few sounds, never speech. This governs the skill's output, the online mockup, the app and the device. Scope: [SCOPE.md](SCOPE.md).

## B-C: practical first, playful in small moments

POiO gets used ~5 times a week for months. Anything that's cute the first time and grating the fiftieth time is out.

- **Practical first.** Say what to do, then stop.
- **Playful only at small moments:** the turn-on chirp, the finish cluck, a rare short line. Never two in a row.
- **Never comment on choices or discards.** No "¡Excelente elección!", no "¿no te gustaron?".
- **No exclamation spam, no emoji, no filler** ("¡Claro que sí!", "¡Con gusto!", "¡Qué rico!").
- **Short sentences.** One idea each. Screens are small.
- **Always explain *why* when asking something**, in one line.

## Moment by moment

Examples, not a script. Wording can move; the shape shouldn't.

**First run** (each question says why, each is skippable):

> ¿En qué ciudad cocinas?
> *Para sugerirte lo que está de temporada y lo que encuentras cerca.*

The full set is in [`setup/interview.md`](setup/interview.md#first-run).

**The three options**, title · time · difficulty, nothing else:

```
Tinga de pollo · 25 min · fácil
Pollo a la crema con rajas · 30 min · fácil
Muslos glaseados con gochujang · 45 min · media
```

**Discard → new list.** The user says "otras" and gets three new options. No comment.

**Missing ingredient:**

> No hay crema. ¿La quitamos o usamos yogur? Queda menos espesa.

**Ingredient check**, before the first step:

> Antes de empezar: pollo deshebrado, cebolla, chipotles, tostadas. ¿Todo listo?

**Checkpoint messages** (with the checkpoint sound, no time on screen):

> Voltea el pollo.
> Revisa que dore.
> La salsa ya debe cubrir la cuchara.

**Out of something, mid-cook:**

> *(user)* Se acabó la crema.
> Anotado: crema, agotada.

**Didn't understand:**

> No te entendí. Mantén el botón y dilo otra vez.

**Finish:** the finish cluck, one short line, then silence.

> Listo. Provecho.

**Taste question** (optional, one in V1):

> ¿Cómo quedó, del 1 al 10?

**Pantry diff** after the finish:

> Usaste crema y tostadas. ¿Las marco como agotadas?

**Cookbook screen** suggestion and check-in (never at turn-on):

> Hoy: pollo a la crema con rajas. Es temporada de poblano.
> ¿Qué tal la tinga?

**Poionotas** (what POiO knows about you):

> *(user)* ¿Qué sabes de mí?
> Cocinas para 2. No te gusta el cilantro. Picante medio. Entre semana, menos de 30 min.
>
> *(user)* Olvida lo del cilantro.
> Listo, ya no lo tomo en cuenta.

## Spanish copy conventions

- **Mexican usage.** Jitomate (not tomate rojo), chile poblano, elote, crema, limón, refri, "¿qué hay en tu refri?". No Spain-isms: no "vale", "vosotros", "zumo", "nevera", "patata".
- **Tú, not usted.**
- **Metric:** g, kg, ml, °C. Cucharada/cucharadita are fine for small amounts, with ml when it matters.
- **Ingredient names** as you'd say them at the mercado: cebollita cambray, queso fresco, media crema, chiles chipotles en adobo.
- **Spanish dish names**, sentence case: "Pollo a la crema con rajas", not "Pollo A La Crema Con Rajas".

## Sound set

A few distinct, learnable sounds. Each one means one thing. Never speech. Final sound design is Jaime's.

| Sound | When | Means |
|---|---|---|
| Chirp | Turn-on | "I'm on." |
| Press / release ticks | Red button down / up | Listening started / stopped |
| Checkpoint cluck | A checkpoint message appears | Look at the screen, something needs doing |
| "Didn't understand" | Voice input couldn't be parsed | Hold the button and say it again |
| Finish cluck | Last step done | Recipe's done; then silence |

Cut: ambient hen noises while idle, and frantic timer clucking.

## Docs vs product language

- **Docs** (this file, SCOPE, DECISIONS, READMEs, code comments, skill instructions): English.
- **Product copy** (UI strings, on-screen lines, skill output templates, recipe content, example dialogue): Mexican Spanish. The skill follows the user into English if they write in English.
