/**
 * Decap CMS custom widget: NHN Toast UI Editor (markdown ↔ wysiwyg).
 * https://github.com/nhn/tui.editor
 *
 * Registers as widget name "toastui".
 */
(function () {
  var UPLOAD_URL = "/api/upload";
  var MAX_WIDTH = 800;
  var JPEG_QUALITY = 0.8;

  function getEditorCtor() {
    return (window.toastui && window.toastui.Editor) || null;
  }

  function compressImage(file) {
    if (!file || !file.type || file.type.indexOf("image/") !== 0) {
      return Promise.resolve(file);
    }
    if (file.type === "image/svg+xml" || file.type === "image/gif") {
      return Promise.resolve(file);
    }

    return new Promise(function (resolve) {
      var img = new Image();
      var objectUrl = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(objectUrl);
        var width = img.naturalWidth;
        var height = img.naturalHeight;
        if (!width || !height) {
          resolve(file);
          return;
        }
        var scale = width > MAX_WIDTH ? MAX_WIDTH / width : 1;
        if (scale === 1 && file.size < 300 * 1024) {
          resolve(file);
          return;
        }
        var canvas = document.createElement("canvas");
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        var ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        var outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
        canvas.toBlob(
          function (blob) {
            if (!blob || blob.size >= file.size) {
              resolve(file);
              return;
            }
            var ext = outputType === "image/png" ? ".png" : ".jpg";
            resolve(
              new File([blob], file.name.replace(/\.[^.]+$/, "") + ext, {
                type: outputType,
                lastModified: Date.now(),
              }),
            );
          },
          outputType,
          outputType === "image/jpeg" ? JPEG_QUALITY : undefined,
        );
      };
      img.onerror = function () {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };
      img.src = objectUrl;
    });
  }

  function uploadBlob(blob) {
    var file =
      blob instanceof File
        ? blob
        : new File([blob], "paste-" + Date.now() + ".png", {
            type: blob.type || "image/png",
          });

    return compressImage(file).then(function (ready) {
      var now = new Date();
      var year = now.getFullYear();
      var month = String(now.getMonth() + 1).padStart(2, "0");
      var safeName = ready.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      var key = "uploads/" + year + "/" + month + "/" + Date.now() + "-" + safeName;
      return fetch(UPLOAD_URL.replace(/\/$/, "") + "/" + key, {
        method: "PUT",
        headers: { "Content-Type": ready.type || "application/octet-stream" },
        body: ready,
        credentials: "same-origin",
      }).then(function (response) {
        if (!response.ok) {
          return response.text().then(function (text) {
            throw new Error(text || "HTTP " + response.status);
          });
        }
        return response.json().then(function (data) {
          if (!data || !data.url) throw new Error("업로드 응답에 URL이 없습니다.");
          return data.url;
        });
      });
    });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  var ToastUiControl = createClass({
    displayName: "ToastUiControl",

    componentDidMount: function () {
      this._mounted = true;
      var self = this;
      // Wait one frame so the host ref is attached.
      window.requestAnimationFrame(function () {
        if (self._mounted) self.mountEditor();
      });
    },

    componentDidUpdate: function (prevProps) {
      if (!this.editor) return;
      if (prevProps.value === this.props.value) return;
      var next = this.props.value || "";
      var current = this.editor.getMarkdown();
      if (current === next) return;
      this._silent = true;
      this.editor.setMarkdown(next, false);
      this._silent = false;
    },

    componentWillUnmount: function () {
      this._mounted = false;
      if (this.editor) {
        try {
          this.editor.destroy();
        } catch (e) {
          /* ignore */
        }
        this.editor = null;
      }
    },

    mountEditor: function () {
      var self = this;
      var Editor = getEditorCtor();
      if (!Editor) {
        console.error("[toastui] toastui.Editor not found — CDN script missing?");
        return;
      }
      if (!this._host || this.editor) return;

      this.editor = new Editor({
        el: this._host,
        height: "620px",
        initialValue: this.props.value || "",
        initialEditType: "wysiwyg",
        previewStyle: "vertical",
        usageStatistics: false,
        hideModeSwitch: false,
        language: "ko-KR",
        placeholder: "본문을 작성하세요…",
        toolbarItems: [
          ["heading", "bold", "italic", "strike"],
          ["hr", "quote"],
          ["ul", "ol", "task", "indent", "outdent"],
          ["table", "image", "link"],
          ["code", "codeblock"],
          ["scrollSync"],
        ],
        hooks: {
          addImageBlobHook: function (blob, callback) {
            uploadBlob(blob)
              .then(function (url) {
                callback(url, "image");
              })
              .catch(function (err) {
                window.alert(err && err.message ? err.message : "이미지 업로드 실패");
              });
          },
        },
      });

      this.editor.on("change", function () {
        if (self._silent || !self._mounted) return;
        self.props.onChange(self.editor.getMarkdown());
      });
    },

    render: function () {
      var self = this;
      return h(
        "div",
        {
          id: this.props.forID,
          className: [this.props.classNameWrapper, "cms-toastui-wrap"].filter(Boolean).join(" "),
        },
        h("div", {
          className: "cms-toastui-host",
          ref: function (el) {
            self._host = el;
          },
        }),
      );
    },
  });

  var ToastUiPreview = createClass({
    displayName: "ToastUiPreview",
    render: function () {
      var value = this.props.value || "";
      if (window.marked && typeof window.marked.parse === "function") {
        return h("div", {
          className: "cms-toastui-preview",
          dangerouslySetInnerHTML: { __html: window.marked.parse(value) },
        });
      }
      return h(
        "pre",
        { className: "cms-toastui-preview cms-toastui-preview-raw" },
        escapeHtml(value),
      );
    },
  });

  CMS.registerWidget("toastui", ToastUiControl, ToastUiPreview);
})();
