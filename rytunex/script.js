(function () {
  var REPO_API_URL = "https://api.github.com/repos/rayenghanmi/rytunex";
  var repoMetadataPromise = null;

  function fetchRepoMetadata() {
    if (!repoMetadataPromise) {
      repoMetadataPromise = fetch(REPO_API_URL, {
        headers: {
          Accept: "application/vnd.github+json"
        }
      }).then(function (response) {
        if (!response.ok) {
          throw new Error("Failed to fetch repo metadata");
        }
        return response.json();
      });
    }

    return repoMetadataPromise;
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString("en-US");
  }

  function applyVersionTemplates(version) {
    if (!version) return;

    var versionWithV = /^v/i.test(version) ? version : "v" + version;
    var versionNoV = versionWithV.replace(/^v/i, "");
    var targets = document.querySelectorAll("[data-version-template]");

    targets.forEach(function (target) {
      var template = target.getAttribute("data-version-template");
      if (!template) return;

      var rendered = template
        .replace(/\{versionWithV\}/g, versionWithV)
        .replace(/\{versionNoV\}/g, versionNoV);

      target.textContent = rendered;
    });
  }

  function fetchLatestVersion() {
    return fetch(REPO_API_URL + "/releases/latest", {
      headers: {
        Accept: "application/vnd.github+json"
      }
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Failed to fetch latest release");
        }
        return response.json();
      })
      .then(function (releaseData) {
        return releaseData.tag_name || releaseData.name || "";
      });
  }

  function syncLatestVersion() {
    var cachedVersion = "";
    try {
      cachedVersion = localStorage.getItem("rytunex_latest_version") || "";
    } catch (error) {
      cachedVersion = "";
    }

    if (cachedVersion) {
      applyVersionTemplates(cachedVersion);
    }

    fetchLatestVersion()
      .then(function (latestVersion) {
        if (!latestVersion) return;
        applyVersionTemplates(latestVersion);

        try {
          localStorage.setItem("rytunex_latest_version", latestVersion);
        } catch (error) {
          // Ignore storage errors and continue.
        }
      })
      .catch(function () {
        // Keep hardcoded fallback text if API is unavailable.
      });
  }

  function syncSocialProof() {
    var starsTarget = document.querySelector("[data-stars-template]");
    var avatarsContainer = document.querySelector("[data-stargazers-avatars]");
    if (!starsTarget && !avatarsContainer) return;

    fetchRepoMetadata()
      .then(function (repoData) {
        if (starsTarget) {
          var count = formatNumber(repoData.stargazers_count);
          // Build DOM safely — no innerHTML with external data
          starsTarget.textContent = "";
          starsTarget.append(
            document.createTextNode("Trusted by "),
            Object.assign(document.createElement("strong"), { textContent: count }),
            document.createTextNode(" GitHub stargazers")
          );
        }

        if (!avatarsContainer) return null;

        // Use a 1-hour cache for avatar data to avoid re-fetching on every page load.
        var AVATAR_CACHE_KEY = "rytunex_avatars_cache";
        var AVATAR_CACHE_TTL = 3600000; // 1 hour in ms
        var now = Date.now();
        try {
          var cached = JSON.parse(localStorage.getItem(AVATAR_CACHE_KEY) || "null");
          if (cached && cached.ts && (now - cached.ts) < AVATAR_CACHE_TTL && Array.isArray(cached.data) && cached.data.length >= 3) {
            applyAvatars(avatarsContainer, cached.data);
            return null; // skip fetch
          }
        } catch (e) { /* ignore */ }

        var stargazersUrl = (repoData && repoData.stargazers_url) || (REPO_API_URL + "/stargazers");
        return fetch(stargazersUrl + "?per_page=100", {
          headers: {
            Accept: "application/vnd.github+json"
          }
        });
      })
      .then(function (response) {
        if (!response || !avatarsContainer) return null;
        if (!response.ok) {
          throw new Error("Failed to fetch stargazers");
        }
        return response.json();
      })
      .then(function (stargazers) {
        if (!avatarsContainer || !Array.isArray(stargazers) || stargazers.length < 3) return;

        var pickedIndexes = {};
        var picked = [];
        while (picked.length < 3 && Object.keys(pickedIndexes).length < stargazers.length) {
          var index = Math.floor(Math.random() * stargazers.length);
          if (pickedIndexes[index]) continue;
          pickedIndexes[index] = true;
          picked.push(stargazers[index]);
        }

        if (picked.length < 3) return;

        // Store in cache.
        try {
          localStorage.setItem("rytunex_avatars_cache", JSON.stringify({ ts: Date.now(), data: picked }));
        } catch (e) { /* ignore */ }

        applyAvatars(avatarsContainer, picked);
      })
      .catch(function () {
        // Keep fallback avatars/text if API is unavailable or rate-limited.
      });
  }

  function applyAvatars(container, users) {
    var avatars = container.querySelectorAll("img");
    for (var i = 0; i < Math.min(avatars.length, users.length); i++) {
      var user = users[i];
      avatars[i].src = user.avatar_url;
      avatars[i].alt = (user.login || "RyTuneX") + " avatar";
      avatars[i].title = user.login || "RyTuneX stargazer";
    }
  }

  function pickRandomItems(items, count) {
    var pool = Array.isArray(items) ? items.slice() : [];
    var picked = [];

    while (pool.length && picked.length < count) {
      var randomIndex = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(randomIndex, 1)[0]);
    }

    return picked;
  }

  function syncTestimonials() {
    var slots = document.querySelectorAll("[data-testimonial-slot]");
    if (!slots.length) return;

    var testimonials = [
      {
        quote:
          "The most striking aspect of RyTuneX is how directly it addresses user pain points with practical, low-friction solutions.",
        author: "WindowsForum",
        link: "https://windowsforum.com/threads/rytunex-1-3-2-review-the-best-windows-tweaking-tool-for-privacy-and-customization.367929/",
        image: "https://www.google.com/s2/favicons?domain=windowsforum.com&sz=64",
        imageAlt: "WindowsForum logo"
      },
      {
        quote:
          "RyTuneX is more than just an optimization tool - it is a refined solution for anyone looking to unlock their Windows device's full potential.",
        author: "Trisha - TrishTech",
        link: "https://www.trishtech.com/2025/06/rytunex-optimize-and-enhance-your-windows-10-and-11-pc/",
        image: "https://www.google.com/s2/favicons?domain=trishtech.com&sz=64",
        imageAlt: "TrishTech logo"
      },
      {
        quote:
          "It is a free tool built with WinUI 3 and .NET 8 that lets you clean up your system, block telemetry, manage features, and get rid of the junk that ships with Windows.",
        author: "Brian Fagioli - BetaNews",
        link: "https://betanews.com/2025/05/26/rytunex-1-3-2-optimize-windows-11-remove-microsoft-edge/",
        image: "https://www.google.com/s2/favicons?domain=betanews.com&sz=64",
        imageAlt: "BetaNews logo"
      },
      {
        quote:
          "RyTuneX supports Windows 10 and 11, offering users a streamlined approach to managing their systems.",
        author: "MajorGeeks Editors",
        link: "https://www.majorgeeks.com/files/details/rytunex.html",
        image: "https://www.majorgeeks.com/images/logos/majorgeeks-nostar.gif",
        imageAlt: "MajorGeeks logo"
      },
      {
        quote:
          "By far the simplest way to optimize your PC is to get rid of the bloatware that comes pre-packed especially with Windows 11.",
        author: "Alexandra Sava - Softpedia",
        link: "https://www.softpedia.com/get/Tweak/System-Tweak/RyTuneX.shtml",
        image: "https://www.google.com/s2/favicons?domain=softpedia.com&sz=64",
        imageAlt: "Softpedia logo"
      },
      {
        quote:
          "RyTuneX lets users clean up their system, block telemetry, manage Windows features, and remove built-in apps.",
        author: "Brian Fagioli - BetaNews",
        link: "https://betanews.com/article/rytunex-1-3-2-optimize-windows-11-remove-microsoft-edge/",
        image: "https://www.google.com/s2/favicons?domain=betanews.com&sz=64",
        imageAlt: "BetaNews logo"
      },
      {
        quote:
          "Built with WinUI 3 and .NET 8, RyTuneX provides a modern interface and compatibility with Windows 10 and 11.",
        author: "JustGeek",
        link: "https://www.justgeek.fr/rytunex-optimiser-windows-125187/",
        image: "https://www.google.com/s2/favicons?domain=justgeek.fr&sz=64",
        imageAlt: "JustGeek logo"
      },
      {
        quote:
          "RyTuneX has quickly become the favourite tool among PC users in 2025.",
        author: "Techno360",
        link: "https://techno360.in/rytunex-free-windows-optimizer/",
        image: "https://www.google.com/s2/favicons?domain=techno360.in&sz=64",
        imageAlt: "Techno360 logo"
      },
      {
        quote:
          "The free and powerful tool that gives you complete control.",
        author: "Mundobytes",
        link: "https://mundobytes.com/en/Customize-and-optimize-Windows-with-Rytunex/",
        image: "https://www.google.com/s2/favicons?domain=mundobytes.com&sz=64",
        imageAlt: "Mundobytes logo"
      },
      {
        quote:
          "One of the most complete and versatile open source tools for Windows 10 and 11.",
        author: "Actualidad Gadget",
        link: "https://en.actualidadgadget.com/Rytunex:-The-best-tool-for-customizing-and-optimizing-Windows-10-and-11/",
        image: "https://www.actualidadgadget.com/wp-content/uploads/2020/05/cropped-favicon-150x150.png",
        imageAlt: "Actualidad Gadget logo"
      },
      {
        quote:
          "Your go-to solution for a faster, cleaner, and more private Windows experience.",
        author: "MediaKet",
        link: "https://www.mediaket.net/software/maintenance-tools/rytunex.html",
        image: "https://www.google.com/s2/favicons?domain=mediaket.net&sz=64",
        imageAlt: "MediaKet logo"
      }
    ];

    var selectedTestimonials = pickRandomItems(testimonials, Math.min(2, slots.length));
    if (!selectedTestimonials.length) return;

    slots.forEach(function (slot, index) {
      var item = selectedTestimonials[index % selectedTestimonials.length];
      if (!item) return;

      var quoteEl = slot.querySelector("[data-testimonial-quote]");
      var imageEl = slot.querySelector("[data-testimonial-image]");
      var authorEl = slot.querySelector("[data-testimonial-author]");
      var linkEl = slot.querySelector("[data-testimonial-link]");

      if (quoteEl) {
        quoteEl.textContent = '"' + item.quote + '"';
      }

      if (imageEl) {
        imageEl.src = item.image;
        imageEl.alt = item.imageAlt || item.author;
      }

      if (authorEl) {
        authorEl.textContent = item.author;
      }

      if (linkEl) {
        linkEl.href = item.link;
        linkEl.textContent = "Source Review";
      }
    });
  }

  function copyTextToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }

    return new Promise(function (resolve, reject) {
      var textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.setAttribute("readonly", "");
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();

      try {
        var copied = document.execCommand("copy");
        document.body.removeChild(textArea);
        if (copied) {
          resolve();
        } else {
          reject(new Error("Copy command failed"));
        }
      } catch (error) {
        document.body.removeChild(textArea);
        reject(error);
      }
    });
  }

  function setupCopyButtons() {
    var copyButtons = document.querySelectorAll("[data-copy-text]");
    if (!copyButtons.length) return;

    copyButtons.forEach(function (button) {
      var icon = button.querySelector(".material-symbols-outlined, .msr");
      var defaultIcon = icon ? icon.textContent.trim() : "content_copy";

      button.addEventListener("click", function () {
        var text = button.getAttribute("data-copy-text") || "";
        if (!text) return;

        copyTextToClipboard(text)
          .then(function () {
            if (icon) icon.textContent = "check";
            button.setAttribute("title", "Copied!");

            window.setTimeout(function () {
              if (icon) icon.textContent = defaultIcon;
              button.setAttribute("title", "Copy command");
            }, 1400);
          })
          .catch(function () {
            if (icon) icon.textContent = "error";
            button.setAttribute("title", "Copy failed");

            window.setTimeout(function () {
              if (icon) icon.textContent = defaultIcon;
              button.setAttribute("title", "Copy command");
            }, 1400);
          });
      });
    });
  }

  function setupMobileMenu() {
    // Wire by ID — the HTML uses id="mobile-menu-btn" and id="mobile-nav"
    var button = document.getElementById("mobile-menu-btn");
    var menu = document.getElementById("mobile-nav");
    if (!button || !menu) return;

    function closeMenu() {
      menu.classList.remove("open");
      button.setAttribute("aria-expanded", "false");
      var iconClose = button.querySelector(".msr");
      if (iconClose) iconClose.textContent = "menu";
    }

    button.addEventListener("click", function () {
      var isOpen = menu.classList.contains("open");
      menu.classList.toggle("open", !isOpen);
      button.setAttribute("aria-expanded", isOpen ? "false" : "true");
      var icon = button.querySelector(".msr");
      if (icon) icon.textContent = isOpen ? "menu" : "close";
    });

    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        closeMenu();
      });
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth >= 900) {
        closeMenu();
      }
    });
  }

  function normalizeHash(hash) {
    return (hash || "").replace(/^#/, "").trim();
  }

  function setActiveByHash(linkSelector, activeClass, hash) {
    var normalized = normalizeHash(hash);
    var links = document.querySelectorAll(linkSelector);

    links.forEach(function (link) {
      var linkHash = normalizeHash(link.getAttribute("href"));
      var isActive = normalized && linkHash === normalized;
      link.classList.toggle(activeClass, isActive);
    });
  }

  function setActivePageLinks() {
    var currentPage = window.location.pathname.split("/").pop() || "index.html";
    var pageLinks = document.querySelectorAll("[data-page-link]");

    pageLinks.forEach(function (link) {
      var href = (link.getAttribute("href") || "").split("#")[0];
      var targetPage = href || "index.html";
      var isActive = targetPage === currentPage;
      link.classList.toggle("is-active", isActive);
      link.classList.toggle("active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function setupSectionObserver(sectionSelector, linkSelector, activeClass) {
    var sections = document.querySelectorAll(sectionSelector);
    if (!sections.length) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            setActiveByHash(linkSelector, activeClass, "#" + entry.target.id);
          }
        });
      },
      {
        root: null,
        threshold: 0.35,
        rootMargin: "-20% 0px -55% 0px"
      }
    );

    sections.forEach(function (section) {
      if (section.id) observer.observe(section);
    });
  }

  function init() {
    setActivePageLinks();
    setupCopyButtons();
    setupMobileMenu();
    syncLatestVersion();
    syncSocialProof();
    syncTestimonials();

    setupSectionObserver("section[id], h2[id], h3[id]", ".nav-link[href^='#']", "is-active");
    setupSectionObserver("section[id], h2[id], h3[id]", ".sidebar-link[href^='#']", "is-active");
    setupSectionObserver("section[id], h2[id], h3[id]", ".toc-link[href^='#']", "is-active");

    if (window.location.hash) {
      setActiveByHash(".nav-link[href^='#']", "is-active", window.location.hash);
      setActiveByHash(".sidebar-link[href^='#']", "is-active", window.location.hash);
      setActiveByHash(".toc-link[href^='#']", "is-active", window.location.hash);
    }

    window.addEventListener("hashchange", function () {
      setActiveByHash(".nav-link[href^='#']", "is-active", window.location.hash);
      setActiveByHash(".sidebar-link[href^='#']", "is-active", window.location.hash);
      setActiveByHash(".toc-link[href^='#']", "is-active", window.location.hash);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
