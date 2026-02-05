const { contextBridge, ipcRenderer } = require("electron");

const BACKEND_PORT = process.env.BACKEND_PORT || "5000";

contextBridge.exposeInMainWorld("api", {
    getHealth: () => ipcRenderer.invoke("api:health"),
    auth: {
        login: (creds) => ipcRenderer.invoke("auth:login", creds),
        logout: () => ipcRenderer.invoke("auth:logout"),
        status: () => ipcRenderer.invoke("auth:status")
    },
    videos: {
        list: () => ipcRenderer.invoke("videos:list"),
        import: () => ipcRenderer.invoke("videos:import"),
        delete: (id) => ipcRenderer.invoke("videos:delete", id),
        upload: (payload) => ipcRenderer.invoke("videos:upload", payload),
        openExternal: (url) => ipcRenderer.invoke("videos:openExternal", url)
    },
    playlists: {
        list: () => ipcRenderer.invoke("playlists:list"),
        getlist: () => ipcRenderer.invoke("playlists:getlist", playlistId),
        create: () => ipcRenderer.invoke("playlists:create", playlistName),
        additem: () => ipcRenderer.invoke("playlists:addItem", playlistId, videoId),
        removeitem: () => ipcRenderer.invoke("playlists:removeItem", playlistName, videoId),
    }
});