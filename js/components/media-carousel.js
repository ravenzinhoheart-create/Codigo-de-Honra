/**
 * MOTOCLUBE
 * Media Carousel — Premium 1:1
 *
 * - Até 10 mídias
 * - Imagens e vídeos
 * - Sempre renderizados em 1:1
 * - Swipe horizontal
 * - Contador
 * - Remoção opcional para compositores
 */

import { icon } from "../icons/icons.js";

function normalizeMediaItem(item = {}) {
    if (typeof item === "string") {
        return {
            type: "image",
            src: item,
            url: item,
            alt: "Mídia"
        };
    }

    const src = item.src || item.url || item.preview || item.dataUrl || "";

    return {
        ...item,
        type: item.type === "video" ? "video" : "image",
        src,
        url: item.url || src,
        alt: item.alt || "Mídia"
    };
}

export function createMediaCarousel(media = [], options = {}) {
    const {
        showCounter = true,
        removable = false,
        onRemove = null
    } = options;

    const items = Array.isArray(media)
        ? media.slice(0, 10).map(normalizeMediaItem).filter(item => item.src)
        : [];

    const container = document.createElement("div");
    container.className = "media-carousel";

    if (!items.length) {
        container.classList.add("media-carousel--empty");
        return container;
    }

    const track = document.createElement("div");
    track.className = "media-carousel__track";
    track.setAttribute("role", "region");
    track.setAttribute("aria-label", "Mídias");

    items.forEach((item, index) => {
        const slide = document.createElement("div");
        slide.className = "media-carousel__slide";
        slide.dataset.index = String(index);

        if (item.type === "video") {
            const video = document.createElement("video");
            video.src = item.src;
            video.controls = false;
            video.playsInline = true;
            video.muted = true;
            video.autoplay = false;
            video.preload = index === 0 ? "auto" : "metadata";
            video.setAttribute("aria-label", item.alt || `Vídeo ${index + 1}`);
            slide.appendChild(video);

            const mute = document.createElement("button");
            mute.type = "button";
            mute.className = "media-carousel__mute";
            mute.setAttribute("aria-label", "Ativar som");
            const updateMute = () => {
                mute.innerHTML = icon(video.muted ? "volumeOff" : "volume", { size: 16, decorative: true });
                mute.setAttribute("aria-label", video.muted ? "Ativar som" : "Silenciar");
            };
            updateMute();
            mute.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();
                video.muted = !video.muted;
                updateMute();
                if (video.paused) video.play().catch(() => {});
            });
            slide.appendChild(mute);

            video.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();
                if (video.paused) video.play().catch(() => {});
                else video.pause();
            });
        } else {
            const image = document.createElement("img");
            image.src = item.src;
            image.alt = item.alt || `Imagem ${index + 1}`;
            image.loading = index === 0 ? "eager" : "lazy";
            image.decoding = "async";
            slide.appendChild(image);
        }

        if (removable && typeof onRemove === "function") {
            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "media-carousel__remove";
            remove.setAttribute("aria-label", `Remover mídia ${index + 1}`);
            remove.innerHTML = icon("close", { size: 17, decorative: true });
            remove.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();
                onRemove(index);
            });
            slide.appendChild(remove);
        }

        track.appendChild(slide);
    });

    container.appendChild(track);

    const total = items.length;
    const counter = document.createElement("div");
    counter.className = "media-carousel__counter";
    counter.textContent = `1 / ${total}`;
    counter.hidden = !showCounter || total <= 1;
    container.appendChild(counter);

    const slides = Array.from(track.querySelectorAll(".media-carousel__slide"));

    // Experiência de vídeo estilo feed: autoplay quando o card está em foco,
    // pausa quando sai de foco e preserva a posição para retomar naturalmente.
    if (typeof IntersectionObserver !== "undefined") {
        const videoObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                const video = entry.target.querySelector("video");
                if (!video) return;
                if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
                    video.play().catch(() => {});
                } else {
                    video.pause();
                }
            });
        }, { threshold: [0, 0.65, 1] });
        slides.forEach(slide => videoObserver.observe(slide));
    }

    if (total > 1) {
        const getIndex = () => {
            if (!slides.length) return 0;

            const viewport = track.getBoundingClientRect();
            const center = track.scrollLeft + viewport.width / 2;
            let bestIndex = 0;
            let bestDistance = Number.POSITIVE_INFINITY;

            slides.forEach((slide, index) => {
                const distance = Math.abs(
                    (slide.offsetLeft + slide.offsetWidth / 2) - center
                );

                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestIndex = index;
                }
            });

            return Math.max(0, Math.min(total - 1, bestIndex));
        };

        const syncCounter = () => {
            counter.textContent = `${getIndex() + 1} / ${total}`;
        };

        /*
         * Mobile-first gesture model:
         * - gesto vertical continua sendo o scroll normal da página;
         * - somente quando o movimento horizontal for claramente dominante
         *   o carousel assume o gesto;
         * - não existem setas: a navegação é exclusivamente por swipe.
         */
        let gesture = null;

        track.addEventListener("touchstart", event => {
            const touch = event.touches?.[0];
            if (!touch) return;

            gesture = {
                startX: touch.clientX,
                startY: touch.clientY,
                lastX: touch.clientX,
                horizontal: false
            };
        }, { passive: true });

        track.addEventListener("touchmove", event => {
            if (!gesture) return;

            const touch = event.touches?.[0];
            if (!touch) return;

            const dx = touch.clientX - gesture.startX;
            const dy = touch.clientY - gesture.startY;

            if (!gesture.horizontal) {
                if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;

                if (Math.abs(dy) > Math.abs(dx)) {
                    gesture = null;
                    return;
                }

                gesture.horizontal = true;
            }

            if (gesture.horizontal) {
                event.preventDefault();
                track.style.scrollSnapType = "none";

                const delta = touch.clientX - gesture.lastX;
                track.scrollLeft -= delta;
                gesture.lastX = touch.clientX;
            }
        }, { passive: false });

        let snapAnimation = null;

        const snapToSlide = slide => {
            if (!slide) return;

            const targetLeft = slide.offsetLeft;
            const startLeft = track.scrollLeft;
            const distance = targetLeft - startLeft;

            if (Math.abs(distance) < 1) {
                track.scrollLeft = targetLeft;
                return;
            }

            if (snapAnimation) {
                cancelAnimationFrame(snapAnimation);
                snapAnimation = null;
            }

            const startedAt = performance.now();
            const duration = 420;

            const easeOut = progress =>
                1 - Math.pow(1 - progress, 3);

            const animate = now => {
                const progress = Math.min(1, (now - startedAt) / duration);
                track.scrollLeft =
                    startLeft + distance * easeOut(progress);

                if (progress < 1) {
                    snapAnimation = requestAnimationFrame(animate);
                } else {
                    track.scrollLeft = targetLeft;
                    track.style.scrollSnapType = "x mandatory";
                    snapAnimation = null;
                }
            };

            snapAnimation = requestAnimationFrame(animate);
        };

        track.addEventListener("touchend", () => {
            if (!gesture?.horizontal) {
                gesture = null;
                return;
            }

            const current = getIndex();
            const dx = gesture.lastX - gesture.startX;
            const threshold = Math.max(24, Math.min(56, track.clientWidth * 0.075));

            let target = current;

            if (Math.abs(dx) >= threshold) {
                target = dx < 0
                    ? Math.min(total - 1, current + 1)
                    : Math.max(0, current - 1);
            }

            snapToSlide(slides[target]);
            gesture = null;
        }, { passive: true });

        track.addEventListener("touchcancel", () => {
            gesture = null;
        }, { passive: true });

        track.addEventListener("scroll", syncCounter, { passive: true });
        window.addEventListener("resize", syncCounter, { passive: true });
        syncCounter();
    }

    if (!showCounter) {
        counter.hidden = true;
    }

    return container;
}

export default createMediaCarousel;
