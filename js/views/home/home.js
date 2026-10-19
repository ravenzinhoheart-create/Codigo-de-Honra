/**
 * Motoclube
 * View: Home
 *
 * Home contém somente:
 * 1. Próximo evento / countdown
 * 2. Feed
 */

import { router } from "../../core/router.js";
import {
    renderCountdown,
    initializeCountdown,
    stopCountdown
} from "./countdown.js";

import {
    renderFeed,
    initializeFeed
} from "./feed.js";
import { getPosts } from "../../services/posts.js";
import { getEvents } from "../../services/events.js";
import { events as eventBus } from "../../core/events.js";


let currentHomeData = {
    nextEvent: null,
    posts: []
};

let homeUnsubscribers = [];
let eventLifecycleTimer = null;


/* =========================================================
   RENDER HOME
========================================================= */

export async function renderHome(data = {}) {

    // Se a rota não recebeu dados explícitos, a Home busca
    // diretamente da camada de serviços local. Essa mesma
    // fronteira poderá ser substituída pelo backend depois.
    let nextEvent = data.nextEvent || null;
    let posts = Array.isArray(data.posts) ? data.posts : null;
    if (posts === null && data.optimisticPost) posts = [data.optimisticPost];
    else if (Array.isArray(posts) && data.optimisticPost) posts = [data.optimisticPost, ...posts.filter(item => String(item.id) !== String(data.optimisticPost.id))];

    if (!nextEvent) {
        try {
            const allEvents = await getEvents();
            const now = Date.now();
            const ongoing = allEvents
                .filter(event => event.status === "in_progress")
                .sort((a, b) => new Date(a.startAt || a.dateTime || 0) - new Date(b.startAt || b.dateTime || 0));
            const upcoming = allEvents
                .filter(event => event.status !== "finished" && event.status !== "cancelled")
                .filter(event => new Date(event.startAt || event.dateTime || 0).getTime() >= now)
                .sort((a, b) => new Date(a.startAt || a.dateTime || 0) - new Date(b.startAt || b.dateTime || 0));
            nextEvent = ongoing[0] || upcoming[0] || null;
        } catch (error) {
            console.error("[HOME] Falha ao carregar eventos:", error);
        }
    }

    if (posts === null) {
        try {
            posts = await getPosts();
        } catch (error) {
            console.error("[HOME] Falha ao carregar feed:", error);
            posts = [];
        }
    }

    currentHomeData = {
        nextEvent,
        posts: Array.isArray(posts) ? posts : [],
        focusPostId: data.focusPostId ? String(data.focusPostId) : null
    };


    const appView =
        document.getElementById(
            "app-view"
        );


    if (!appView) {
        return;
    }


    stopCountdown();


    appView.innerHTML = `
        <section class="home-view">

            <main class="home-view__content">

                <section
                    id="home-countdown"
                    class="home-view__countdown"
                >
                    ${renderCountdown(
                        currentHomeData.nextEvent
                    )}
                </section>


                <section
                    id="home-feed"
                    class="home-view__feed"
                >
                    ${renderFeed(
                        currentHomeData.posts
                    )}
                </section>

            </main>

        </section>
    `;


    initializeHome();
    bindHomeLiveUpdates();

    if (currentHomeData.focusPostId) {
        focusHomePost(currentHomeData.focusPostId);
    }
}


/* =========================================================
   FOCUS POST
========================================================= */

function focusHomePost(postId) {
    const id = String(postId || "");
    if (!id) return;

    // O feed já foi renderizado. Usamos dois frames para garantir que
    // o layout do carousel e dos cards esteja calculado antes do scroll.
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const post = Array.from(
                document.querySelectorAll(".feed-post[data-post-id]")
            ).find(
                element => String(element.dataset.postId || "") === id
            );

            if (!post) return;

            post.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

            post.classList.add("is-focused");
            window.setTimeout(() => {
                post.classList.remove("is-focused");
            }, 1200);
        });
    });
}


/* =========================================================
   INITIALIZE
========================================================= */

function initializeHome() {

    const countdownContainer =
        document.getElementById(
            "home-countdown"
        );


    if (
        countdownContainer &&
        currentHomeData.nextEvent
    ) {

        initializeCountdown(
            countdownContainer,
            currentHomeData.nextEvent
        );
    }


    const feedContainer =
        document.getElementById(
            "home-feed"
        );


    if (feedContainer) {

        initializeFeed(
            feedContainer,
            currentHomeData.posts
        );
    }


    initializeHomeNavigation();
}


/* =========================================================
   NAVIGATION
========================================================= */

function initializeHomeNavigation() {

    const countdown = document.querySelector("[data-countdown-event], [data-countdown-empty]");

    countdown?.addEventListener("click", () => {
        const eventId = countdown.dataset.countdownEvent || null;
        router.navigate("events", eventId ? { eventId } : {});
    });
}


function clearHomeLiveUpdates() {
    homeUnsubscribers.forEach(unsubscribe => unsubscribe?.());
    homeUnsubscribers = [];
    if (eventLifecycleTimer) {
        clearInterval(eventLifecycleTimer);
        eventLifecycleTimer = null;
    }
}

function bindHomeLiveUpdates() {
    clearHomeLiveUpdates();

    homeUnsubscribers.push(
        eventBus.on("post:created", async (post) => {
            if (router.getCurrentRoute?.() !== "home" || !post) return;
            const existing = currentHomeData.posts.filter(item => String(item.id) !== String(post.id));
            await renderHome({
                nextEvent: currentHomeData.nextEvent,
                posts: [post, ...existing]
            });
        }),
        eventBus.on("post:persisted", async (post) => {
            if (router.getCurrentRoute?.() !== "home" || !post) return;
            const posts = currentHomeData.posts.map(item => String(item.id) === String(post.id) ? post : item);
            await renderHome({ nextEvent: currentHomeData.nextEvent, posts });
        }),
        eventBus.on("post:failed", async ({id,error} = {}) => {
            if (router.getCurrentRoute?.() !== "home") return;
            currentHomeData.posts = currentHomeData.posts.filter(item => String(item.id) !== String(id));
            await renderHome({ nextEvent: currentHomeData.nextEvent, posts: currentHomeData.posts });
            console.warn("[HOME] Publicação removida após falha de persistência:", error);
        }),
        eventBus.on("post:deleted", async () => {
            if (router.getCurrentRoute?.() !== "home") return;
            await renderHome({
                nextEvent: currentHomeData.nextEvent,
                posts: await getPosts()
            });
        }),
        eventBus.on("post:updated", async () => {
            if (router.getCurrentRoute?.() !== "home") return;
            await renderHome({
                nextEvent: currentHomeData.nextEvent,
                posts: await getPosts()
            });
        }),
        eventBus.on("post:interaction", async () => {
            if (router.getCurrentRoute?.() !== "home") return;
            await renderHome({
                nextEvent: currentHomeData.nextEvent,
                posts: await getPosts()
            });
        }),
        eventBus.on("ride:updated", async () => {
            if (router.getCurrentRoute?.() !== "home") return;
            await renderHome({
                nextEvent: currentHomeData.nextEvent,
                posts: await getPosts()
            });
        }),
        eventBus.on("sos:created", async () => {
            if (router.getCurrentRoute?.() !== "home") return;
            await renderHome({
                nextEvent: currentHomeData.nextEvent,
                posts: await getPosts()
            });
        }),
        eventBus.on("sos:updated", async () => {
            if (router.getCurrentRoute?.() !== "home") return;
            await renderHome({
                nextEvent: currentHomeData.nextEvent,
                posts: await getPosts()
            });
        }),
        eventBus.on("sos:resolved", async () => {
            if (router.getCurrentRoute?.() !== "home") return;
            await renderHome({
                nextEvent: currentHomeData.nextEvent,
                posts: await getPosts()
            });
        }),
        eventBus.on("event:created", async () => {
            if (router.getCurrentRoute?.() !== "home") return;
            const allEvents = await getEvents();
            const now = Date.now();
            const next = allEvents.find(event => event.status === "in_progress") || allEvents.find(event => event.status !== "finished" && event.status !== "cancelled" && new Date(event.startAt || event.dateTime || 0).getTime() >= now) || null;
            await renderHome({
                nextEvent: next,
                posts: await getPosts()
            });
        }),
        eventBus.on("event:updated", async () => {
            if (router.getCurrentRoute?.() !== "home") return;
            const allEvents = await getEvents();
            const now = Date.now();
            const next = allEvents.find(event => event.status === "in_progress") || allEvents.find(event => event.status !== "finished" && event.status !== "cancelled" && new Date(event.startAt || event.dateTime || 0).getTime() >= now) || null;
            await renderHome({
                nextEvent: next,
                posts: await getPosts()
            });
        })
    );

    eventLifecycleTimer = window.setInterval(async () => {
        if (router.getCurrentRoute?.() !== "home") return;
        try { await getEvents(); } catch (error) { console.warn("[HOME] Falha no ciclo de vida dos eventos:", error); }
    }, 1000);
}


/* =========================================================
   UPDATE HOME
========================================================= */

export function updateHome(data = {}) {

    renderHome({
        nextEvent:
            data.nextEvent ??
            currentHomeData.nextEvent,

        posts:
            data.posts ??
            currentHomeData.posts
    });
}


/* =========================================================
   GET CURRENT DATA
========================================================= */

export function getHomeData() {

    return {
        nextEvent:
            currentHomeData.nextEvent,

        posts:
            [...currentHomeData.posts]
    };
}


/* =========================================================
   CLEANUP
========================================================= */

export function destroyHome() {

    stopCountdown();
    clearHomeLiveUpdates();

    currentHomeData = {
        nextEvent: null,
        posts: [],
        focusPostId: null
    };
}