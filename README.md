# Mus

Mus a cuatro para jugar en el iPad: tú y tu compañero (bot) contra dos bots.
Reglas: 8 reyes, partida a 30 o 40 y señas con el compañero. Ocho personajes con estilos de juego
distintos, en mesas preparadas o a tu gusto.

Juega en https://pedroalg.github.io/mus/ — en el iPad, *Compartir → Añadir a pantalla de inicio*
para tenerlo como app a pantalla completa y sin conexión.

## Desarrollo

Para entender el código sin saber TypeScript, lee [COMO-FUNCIONA.md](COMO-FUNCIONA.md).

```bash
npm install
npm test        # reglas, señas, cálculo de los bots y partidas completas
node scripts/torneo.ts liga 300             # liga de personajes contra Rosa
npm run offline -- https://pedroalg.github.io/mus/   # prueba sin conexión con Chrome
npm run build   # genera docs/ (GitHub Pages) y dist/mus.html
```

- `src/rules.ts` comparación de manos (grande, chica, pares, juego, punto)
- `src/game.ts` desarrollo de una mano: mus, descartes, envites y recuento
- `src/bots.ts` decisiones de los bots y señas
- `src/ui.ts` mesa, cartas y botones

## Créditos

Cartas: baraja propia, dibujada en SVG en `src/cardArt.ts`.
