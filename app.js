/* app.js — shared JS for Dr. Ugo Ezema website */

(function () {
  "use strict";

  /* ========================================
     REVEAL-ON-SCROLL (IntersectionObserver)
     Bullet-proof replacement for animation-timeline.
     ======================================== */
  var revealEls = document.querySelectorAll(".fade-in");

  function revealAll() {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  if (!("IntersectionObserver" in window)) {
    /* Old browser — show everything immediately */
    revealAll();
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.05 });

    revealEls.forEach(function (el) { io.observe(el); });

    /* Safety net — if anything is still hidden after 1.5s
       (e.g. embedded in an iframe that never scrolls), reveal it. */
    setTimeout(function () {
      revealEls.forEach(function (el) {
        if (!el.classList.contains("is-visible")) {
          var rect = el.getBoundingClientRect();
          if (rect.top < window.innerHeight * 1.2) {
            el.classList.add("is-visible");
          }
        }
      });
    }, 1500);
  }

  /* ========================================
     THEME TOGGLE
     ======================================== */
  var toggle = document.querySelector("[data-theme-toggle]");
  var root = document.documentElement;
  var theme = window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
  root.setAttribute("data-theme", theme);
  updateToggleIcon();

  if (toggle) {
    toggle.addEventListener("click", function () {
      theme = theme === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", theme);
      toggle.setAttribute(
        "aria-label",
        "Switch to " + (theme === "dark" ? "light" : "dark") + " mode"
      );
      updateToggleIcon();
    });
  }

  function updateToggleIcon() {
    if (!toggle) return;
    toggle.innerHTML =
      theme === "dark"
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }

  /* ========================================
     STICKY HEADER SCROLL STATE
     ======================================== */
  var header = document.querySelector(".site-header");
  if (header) {
    var lastScroll = 0;
    window.addEventListener(
      "scroll",
      function () {
        var currentScroll = window.scrollY;
        if (currentScroll > 20) {
          header.classList.add("scrolled");
        } else {
          header.classList.remove("scrolled");
        }
        lastScroll = currentScroll;
      },
      { passive: true }
    );
  }

  /* ========================================
     MOBILE NAV
     ======================================== */
  var hamburger = document.querySelector(".hamburger");
  var mobileNav = document.querySelector(".mobile-nav");
  var mobileLinks = document.querySelectorAll(".mobile-nav-links a");

  if (hamburger && mobileNav) {
    hamburger.addEventListener("click", function () {
      hamburger.classList.toggle("active");
      mobileNav.classList.toggle("open");
      document.body.style.overflow = mobileNav.classList.contains("open")
        ? "hidden"
        : "";
    });

    mobileLinks.forEach(function (link) {
      link.addEventListener("click", function () {
        hamburger.classList.remove("active");
        mobileNav.classList.remove("open");
        document.body.style.overflow = "";
      });
    });
  }

  /* ========================================
     SESSION-AWARE SUBSCRIBER TRACKING
     Uses a session cookie so it persists across pages
     but clears when the browser tab/window closes.
     ======================================== */
  function hasSubscribed() {
    return document.cookie.indexOf("ugo_sub=1") !== -1;
  }

  function markSubscribed() {
    /* Session cookie — no max-age/expires means it dies when browser closes */
    document.cookie = "ugo_sub=1;path=/;SameSite=Lax";
  }

  /* ========================================
     WELCOME POPUP (homepage only, once per session)
     ======================================== */
  var popupShown = false;
  var overlay = document.querySelector(".modal-overlay");

  if (overlay && !popupShown && !hasSubscribed()) {
    setTimeout(function () {
      if (!popupShown && !hasSubscribed()) {
        overlay.classList.add("open");
        popupShown = true;
      }
    }, 3000);

    var closeBtn = overlay.querySelector(".modal-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        overlay.classList.remove("open");
      });
    }

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) {
        overlay.classList.remove("open");
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("open")) {
        overlay.classList.remove("open");
      }
    });
  }

  /* ========================================
     FORM SUBMISSIONS
     ----------------
     Three behaviors based on attributes:
     1. data-mailto-fallback="true" — let the browser handle the mailto: action
        natively (opens email client). We just show a brief confirmation.
     2. Real action (Formspree, etc.) on a non-mailto: URL — allow normal submit.
     3. No action / data-form newsletter — preventDefault, show "Thank you!",
        mark subscribed cookie. Will be wired to ESP once one is chosen.
     ======================================== */
  var forms = document.querySelectorAll("form[data-form]");
  forms.forEach(function (form) {
    form.addEventListener("submit", function (e) {
      var btn = form.querySelector('button[type="submit"]');
      var originalText = btn.textContent;
      var isMailto = form.getAttribute("data-mailto-fallback") === "true";
      var action = form.getAttribute("action") || "";
      var hasRealAction = action && action !== "" && action !== "#";

      if (isMailto) {
        /* Let the browser open the mail client. Show a brief confirmation. */
        btn.textContent = "Opening your email…";
        btn.disabled = true;
        setTimeout(function () {
          btn.textContent = originalText;
          btn.disabled = false;
        }, 2500);
        return; /* allow native submit */
      }

      if (hasRealAction && action.indexOf("mailto:") !== 0) {
        /* Real backend (Formspree etc.) — let it submit. */
        return;
      }

      /* Fallback: newsletter / contact without a backend. Show confirmation. */
      e.preventDefault();
      btn.textContent = "Thank you!";
      btn.disabled = true;

      /* Mark the visitor as subscribed for this session */
      markSubscribed();

      /* If form is inside a modal overlay, fade it away after submission */
      var parentOverlay = form.closest(".modal-overlay");
      if (parentOverlay) {
        setTimeout(function () {
          parentOverlay.classList.remove("open");
          setTimeout(function () {
            btn.textContent = originalText;
            btn.disabled = false;
            form.reset();
          }, 400);
        }, 1200);
      } else {
        setTimeout(function () {
          btn.textContent = originalText;
          btn.disabled = false;
          form.reset();
        }, 2500);
      }
    });
  });

  /* ========================================
     ARTICLE PAYWALL POPUP (newsletter page)
     ======================================== */
  var articleCards = document.querySelectorAll(".article-preview-card");
  var articleModal = document.getElementById("article-modal");

  if (articleCards.length && articleModal) {
    articleCards.forEach(function (card) {
      card.addEventListener("click", function (e) {
        e.preventDefault();
        /* Only show paywall if visitor hasn't subscribed this session */
        if (!hasSubscribed()) {
          articleModal.classList.add("open");
        }
      });
    });

    var articleClose = articleModal.querySelector(".modal-close");
    if (articleClose) {
      articleClose.addEventListener("click", function () {
        articleModal.classList.remove("open");
      });
    }

    articleModal.addEventListener("click", function (e) {
      if (e.target === articleModal) {
        articleModal.classList.remove("open");
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && articleModal.classList.contains("open")) {
        articleModal.classList.remove("open");
      }
    });
  }

  /* ========================================
     ACTIVE NAV LINK
     ======================================== */
  var currentPage = window.location.pathname.split("/").pop() || "index.html";
  var navLinks = document.querySelectorAll(".nav-links a, .mobile-nav-links a");
  navLinks.forEach(function (link) {
    var href = link.getAttribute("href");
    if (href === "./" + currentPage || href === currentPage) {
      link.classList.add("active");
    } else if (currentPage === "index.html" && (href === "./" || href === "./index.html")) {
      link.classList.add("active");
    }
  });
})();
