# Mus

Mus a cuatro para jugar en el iPad: tú y tu compañero (bot) contra dos bots.
Reglas: 8 reyes, partida a 40, señas del compañero.

Juega en https://pedroalg.github.io/mus/ — en el iPad, *Compartir → Añadir a pantalla de inicio*
para tenerlo como app a pantalla completa y sin conexión.

## Desarrollo

```bash
npm install
npm test        # reglas, señas y 200 partidas entre bots
npm run build   # genera docs/ (GitHub Pages) y dist/mus.html
```

- `src/rules.ts` comparación de manos (grande, chica, pares, juego, punto)
- `src/game.ts` desarrollo de una mano: mus, descartes, envites y recuento
- `src/bots.ts` decisiones de los bots y señas
- `src/ui.ts` mesa, cartas y botones

## Créditos

Cartas: baraja de Heraclio Fournier de 1878, dominio público, vía
[Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:Heraclio_Fournier%E2%80%99s_1878_card_deck).
