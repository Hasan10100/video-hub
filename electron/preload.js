const { contextBridge, ipcRenderer } = require("electron");

const BACKEND_PORT = process.env.BACKEND_PORT || "5000";

contextBridge.exposeInMainWorld("api", {
    getHealth: () => ipcRenderer.invoke("api:health"),
    videos: {
        list: (args) => ipcRenderer.invoke("videos:list", args),
        import: () => ipcRenderer.invoke("videos:import"),
        delete: (id) => ipcRenderer.invoke("videos:delete", id),
        upload: (payload) => ipcRenderer.invoke("videos:upload", payload),
        openExternal: (url) => ipcRenderer.invoke("videos:openExternal", url)
    },
    playlists: {
        list: () => ipcRenderer.invoke("playlists:list"),
        getlist: (playlistId) => ipcRenderer.invoke("playlists:getList", { playlistId }),
        create: (name) => ipcRenderer.invoke("playlists:create", { name }),        
        additem: ({ playlistId, videoId }) => ipcRenderer.invoke("playlists:addItem", { playlistId, videoId }),
        removeitem: ({ playlistId, videoId }) => ipcRenderer.invoke("playlists:removeItem", { playlistId, videoId }),
        deleteplaylist: (playlistId) => ipcRenderer.invoke("playlists:deletePlaylist", { playlistId }),
    }
});