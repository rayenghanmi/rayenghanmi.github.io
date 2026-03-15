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
    return fetchRepoMetadata()
      .then(function (repoData) {
        var releasesUrlTemplate = repoData && repoData.releases_url;
        var releasesLatestUrl = releasesUrlTemplate
          ? releasesUrlTemplate.replace("{/id}", "/latest")
          : REPO_API_URL + "/releases/latest";

        return fetch(releasesLatestUrl, {
          headers: {
            Accept: "application/vnd.github+json"
          }
        });
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
          var template = starsTarget.getAttribute("data-stars-template") || "Trusted by {stars} GitHub stargazers";
          starsTarget.textContent = template.replace(/\{stars\}/g, formatNumber(repoData.stargazers_count));
        }

        if (!avatarsContainer) return null;

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

        var avatars = avatarsContainer.querySelectorAll("img");
        for (var i = 0; i < Math.min(avatars.length, picked.length); i++) {
          var user = picked[i];
          avatars[i].src = user.avatar_url;
          avatars[i].alt = (user.login || "RyTuneX") + " avatar";
          avatars[i].title = user.login || "RyTuneX stargazer";
        }
      })
      .catch(function () {
        // Keep fallback avatars/text if API is unavailable or rate-limited.
      });
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
        image: "https://www.google.com/s2/favicons?domain=majorgeeks.com&sz=64",
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
            "RyTuneX centralizes advanced privacy controls that are normally scattered across Settings, services, and the registry.",
        author: "All Things Windows",
        link: "https://windows.atsit.in/tl/31650/",
        image: "https://www.google.com/s2/favicons?domain=windows.atsit.in&sz=64",
        imageAlt: "All Things Windows logo"
      },
      {
        quote:
            "RyTuneX makes it easy to disable telemetry, manage features, and remove unwanted components from Windows.",
        author: "All Things Windows",
        link: "https://windows.atsit.in/tl/31650/",
        image: "https://www.google.com/s2/favicons?domain=windows.atsit.in&sz=64",
        imageAlt: "All Things Windows logo"
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
      var icon = button.querySelector(".material-symbols-outlined");
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
    var button = document.querySelector("[data-mobile-menu-button]");
    var menu = document.querySelector("[data-mobile-menu]");
    if (!button || !menu) return;

    function closeMenu() {
      menu.classList.add("hidden");
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", "Open menu");
      var iconClose = button.querySelector(".material-symbols-outlined");
      if (iconClose) iconClose.textContent = "menu";
    }

    button.addEventListener("click", function () {
      var isHidden = menu.classList.contains("hidden");
      menu.classList.toggle("hidden", !isHidden);
      button.setAttribute("aria-expanded", isHidden ? "true" : "false");
      button.setAttribute("aria-label", isHidden ? "Close menu" : "Open menu");
      var icon = button.querySelector(".material-symbols-outlined");
      if (icon) icon.textContent = isHidden ? "close" : "menu";
    });

    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        closeMenu();
      });
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth >= 768) {
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

    setupSectionObserver("main section[id]", ".nav-link[href^='#']", "is-active");
    setupSectionObserver("main section[id]", ".sidebar-link[href^='#']", "is-active");
    setupSectionObserver("main section[id]", ".toc-link[href^='#']", "is-active");

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
