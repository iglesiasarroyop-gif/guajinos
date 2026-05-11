# ⚽ Guajinos Soccer

![Guajinos Cover](guajinos_cover_1778516197296.png)

**Guajinos Soccer** es un simulador de fútbol base (fútbol 7) diseñado para ofrecer una experiencia arcade rápida, divertida y visualmente atractiva. Controla a equipos de la liga infantil asturiana en emocionantes partidos 2D con una estética "baby" única.

---

## 🌟 Características Principales

- **🎮 Jugabilidad Arcade**: Controles sencillos (WASD/Flechas + Espacio) optimizados tanto para PC como para dispositivos móviles.
- **👶 Estética Baby**: Jugadores cabezones y divertidos con animaciones fluidas y expresiones dinámicas (¡lloran si pierden!).
- **🎵 Experiencia Inmersiva**: Música de ambiente durante el partido y sonidos de gol personalizados, todo integrado sin dependencias externas.
- **🏆 Modo Liga**: Compite en la liga infantil asturiana, sigue la clasificación y lucha por el Pichichi o el Zamora.
- **📱 PWA Ready**: Instalable en dispositivos móviles para jugar a pantalla completa y sin conexión.
- **📦 Single File Build**: Proceso de build avanzado que genera un único archivo HTML con todos los assets (imágenes y audio) embebidos en Base64.

---

## 🛠️ Stack Tecnológico

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)

---

## 🏗️ Estructura del Proyecto

```mermaid
graph TD
    A[index.html] --> B(game-engine.js)
    A --> C(game-ui.js)
    A --> D(styles.css)
    B --> E(game-data.js)
    B --> F(league-engine.js)
    B --> G(equipos-inline.js)
    
    subgraph "Build Process"
    H[build.js] --> I[dist/super-liquid-soccer.html]
    end
```

---

## 🚀 Cómo Empezar

### Desarrollo
Para jugar en modo desarrollo, simplemente abre `index.html` en tu navegador favorito. Asegúrate de tener los archivos de `musica/` y `escudos/` en sus respectivas carpetas.

### Construcción (Build)
Si deseas generar la versión optimizada en un solo archivo:

1. Instala las dependencias de desarrollo:
   ```bash
   npm install
   ```
2. Ejecuta el script de build:
   ```bash
   npm run build
   ```
3. El resultado estará en `dist/super-liquid-soccer.html`.

---

## 🕹️ Controles

| Acción | PC (Teclado) | Móvil (Touch) |
| :--- | :--- | :--- |
| **Moverse** | `WASD` o `Flechas` | Joystick Virtual (Izquierda) |
| **Pasar** | `Espacio` (toque) | Tap en Pantalla (Derecha) |
| **Tirar** | `Espacio` (mantener) | Hold en Pantalla (Derecha) |
| **Cambiar Jugador** | Automático / Toque | Tap (Derecha) |

---

## 📈 Estados del Juego

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Entrance: Start Match
    Entrance --> Countdown: Positions Reached
    Countdown --> Playing: 3... 2... 1...
    Playing --> Goal: Ball in Net
    Goal --> Countdown: Celebration Ends
    Playing --> EndCelebration: Time Up
    EndCelebration --> Idle: Return to Menu
```

---

## 📄 Licencia

Este proyecto es para uso personal y educativo. Todos los derechos reservados.
