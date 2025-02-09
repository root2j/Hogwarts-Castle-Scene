document.addEventListener("DOMContentLoaded", () => {
    const cloudContainer = document.querySelector(".clouds");
    const cloudCount = 10;

    for (let i = 0; i < cloudCount; i++) {
        const cloud = document.createElement("div");
        cloud.classList.add("cloud");

        // Random size
        const width = Math.random() * 500 + 100; // Random width between 100px and 600px
        const height = width / 2; // Maintain aspect ratio
        cloud.style.width = `${width}px`;
        cloud.style.height = `${height}px`;

        // Random direction
        const angle = Math.random() * 360; // Random angle in degrees
        const distance = Math.random() * 100 + 50; // Random distance between 50vh and 150vh
        const translateX = Math.cos(angle * (Math.PI / 180)) * distance;
        const translateY = Math.sin(angle * (Math.PI / 180)) * distance;
        cloud.style.setProperty("--translate-x", `${translateX}vw`);
        cloud.style.setProperty("--translate-y", `${translateY}vh`);

        // Random top position
        const topPosition = Math.random() * 100; // Random top position between 0% and 100%
        cloud.style.setProperty("--top-position", `${topPosition}%`);

        // Random animation duration
        const duration = Math.random() * 10 + 10; // Random duration between 10s and 20s
        cloud.style.setProperty("--animation-duration", `${duration}s`);

        // Random animation delay
        const delay = Math.random() * 10; // Random delay between 0s and 10s
        cloud.style.setProperty("--animation-delay", `${delay}s`);

        cloudContainer.appendChild(cloud);
    }
});
