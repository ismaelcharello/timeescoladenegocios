# TIME — Sistema de design (contrato)

Fonte única dos valores visuais. Valor de cor, espaço, raio, duração ou curva escrito direto no CSS e que não esteja aqui é violação: use o token de `app/design-tokens.css`.

Pilares do produto: **Aprender · Conectar · Fazer negócios**. Personalidade: editorial, calma, empresarial. Referências (princípios, nunca cópia): Apple (hierarquia e materiais), Linear (densidade e precisão), Stripe (sobriedade em formulários e números), Netflix (descoberta de catálogo).

## Paleta

| Papel | Token | Claro | Escuro |
| --- | --- | --- | --- |
| Marca (navy) | `--time-ink` | `#050829` | `#050829` |
| Ação primária | `--time-violet` | `#3700F0` | `#3700F0` |
| Acento (uso mínimo) | `--time-magenta` | `#FF00E0` | `#FF00E0` |
| Fundo | `--bg` | `#F7F7FB` | `#050829` |
| Superfície | `--surface` | `#FFFFFF` | `#0D1033` |
| Superfície elevada | `--surface-2` | `#EFEFF7` | `#151945` |
| Texto | `--text` | `#0B0D26` | `#F4F4FB` |
| Texto secundário | `--text-muted` | `#555874` | `#B4B6D0` |
| Borda | `--border` | `#DCDCEA` | `#262A5C` |
| Anel de foco | `--focus` | `#5A33FF` | `#A58BFF` |

Regras de cor:
- Magenta aparece só em detalhes (marcador, ponto de estado, fim de um filete). Nunca em fundo grande nem em gradiente de superfície. (apple-design §16 Simplicidade; briefing: evitar excesso de gradiente e neon.)
- Gradiente violeta→magenta existe somente em um elemento por tela (o CTA principal da landing). Formulários usam violeta sólido.
- Texto sobre fundo precisa de contraste mínimo 4,5:1 (7:1 para texto pequeno em `prefers-contrast: more`).

## Tipografia (apple-design §15)
- Fonte: pilha do sistema (`system-ui`), já com optical sizing.
- Tracking por tamanho: display `-0.03em`, título `-0.02em`, corpo `0`, legenda/rótulo `+0.08em`.
- Leading inverso ao tamanho: display `1.05`, título `1.15`, corpo `1.55`.
- Texto corrido: 60–75 caracteres por linha (`max-width: 68ch`).
- Escala: `--fs-xs 0.75rem`, `--fs-sm 0.875rem`, `--fs-md 1rem`, `--fs-lg 1.25rem`, `--fs-xl 1.75rem`, `--fs-2xl clamp(2rem,5vw,3.5rem)`.
- Tamanhos em `rem` (respeita o tamanho de texto do usuário).

## Espaço, raio, sombra
- Espaço em grade de 4px: `--s-1 4px` … `--s-8 64px`.
- Raios: `--r-sm 8px` (inputs), `--r-md 12px` (botões), `--r-lg 20px` (cartões), `--r-pill 999px`.
- Sombra: no máximo duas (`--shadow-1` repouso, `--shadow-2` elevado). Sem sombra colorida.

## Movimento (emil-design-eng)
- Curva de entrada: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`. Nunca `ease-in` em UI.
- Duração: pressionar 120 ms · hover/cor 160 ms · menus e popovers 200 ms · painéis 280 ms. Nada de UI acima de 300 ms.
- Animar só `transform` e `opacity`. Proibido `transition: all`.
- Botão pressionado: `transform: scale(0.97)` no `:active`, resposta no pointer-down.
- Nunca entrar de `scale(0)`: começar em `scale(0.95)` com `opacity: 0`.
- Ações de teclado repetidas não animam.
- `prefers-reduced-motion: reduce`: sem deslocamento; só fade de opacidade.

## Mobile nativo (mobile-native)
- Viewport com `viewport-fit=cover`; áreas seguras com `env(safe-area-inset-*)`.
- Altura de shell com `100dvh`, hero com `100svh`. Nunca `100vh`.
- Inputs com fonte de 16px no mínimo (evita zoom no iOS). Nunca `user-scalable=no`.
- Todo `:hover` dentro de `@media (hover: hover) and (pointer: fine)`.
- `-webkit-tap-highlight-color: transparent` global; todo elemento tocável tem `:active`.
- Alvo de toque mínimo 44×44px.
- `theme-color` por esquema de cor.

## Temas
- Atributo `data-theme` em `<html>`: `light`, `dark` ou ausente (automático, segue o sistema).
- Preferência salva em `localStorage["time-theme"]` (`light` | `dark` | `system`), mesma chave já usada na área de membros.
- Script inline no `<head>` aplica o tema antes da primeira pintura (sem flash).
- `prefers-contrast: more` aumenta bordas e contraste de texto.

## Proibido
Emoji na interface · dado fictício apresentado como real · cartão para tudo · gradiente decorativo · neon · animação que bloqueia navegação · cor fora da paleta (ex.: o verde-azulado que existia no login).
