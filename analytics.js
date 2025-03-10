function enableTracking() {
  console.log("Tracking")
    let script = document.createElement("script");
    script.src = "https://www.googletagmanager.com/gtag/js?id=G-RLN7VTK2L5";
    script.async = true;
    document.head.appendChild(script);

    script.onload = function () {
      window.dataLayer = window.dataLayer || [];
      function gtag() {
        dataLayer.push(arguments);
      }
      gtag("js", new Date());
      gtag("config", "G-RLN7VTK2L5");
    };
  }