import { useEffect, useState } from "react";

export default function App() {
    const [status, setStatus] = useState(null);
    const [videos, setVideos] = useState([]);
    const [playlists, setPlaylists] = useState([]);
    const [selectedPlaylistId, setSelectedPlaylistId] = useState("");
    const [playlistItems, setPlaylistItems] = useState([]);

    const [newPlaylistName, setNewPlaylistName] = useState("");
    const [extTitle, setExtTitle] = useState("");
    const [extUrl, setExtUrl] = useState("");
    const [log, setLog] = useState("");

    function logIt(x) {
        setLog(typeof x === "string" ? x : JSON.stringify(x, null, 2));
    }

    async function refreshVideos() {
        const r = await window.api.videos.list({ type: "all" });
        setVideos(r.items ?? []);
        logIt(r);
    }

    async function refreshPlaylists() {
        const r = await window.api.playlists.list();
        setPlaylists(r.items ?? []);
        logIt(r);
    }

    async function refreshPlaylistItems(pid) {
        if (!pid) {
            setPlaylistItems([]);
            return;
        }
        const r = await window.api.playlists.getlist({ playlistId: Number(pid) });
        setPlaylistItems(r.items ?? []);
        logIt(r);
    }

    useEffect(() => {
        (async () => {
            try {
                const s = await window.api.auth.status();
                setStatus(s);
                await refreshVideos();
                await refreshPlaylists();
            } catch (e) {
                logIt(String(e));
            }
        })();
    }, []);

    return (
        <div style={{ fontFamily: "sans-serif", padding: 16, display: "grid", gap: 16 }}>
            <h2>Video Hub – Desktop-only Test UI</h2>

            <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
                <b>Auth status:</b>
                <pre style={{ marginTop: 8 }}>{JSON.stringify(status, null, 2)}</pre>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* VIDEOS */}
                <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
                    <h3>Library</h3>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                            onClick={async () => {
                                const r = await window.api.videos.import();
                                logIt(r);
                                await refreshVideos();
                            }}
                        >
                            Import Local Video
                        </button>

                        <button onClick={refreshVideos}>Refresh</button>
                    </div>

                    <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                        <div style={{ display: "grid", gap: 6 }}>
                            <input
                                placeholder="External title"
                                value={extTitle}
                                onChange={(e) => setExtTitle(e.target.value)}
                            />
                            <input
                                placeholder="External URL (https://...)"
                                value={extUrl}
                                onChange={(e) => setExtUrl(e.target.value)}
                            />
                            <button
                                onClick={async () => {
                                    const r = await window.api.videos.addExternal({
                                        title: extTitle,
                                        externalUrl: extUrl,
                                        provider: "link"
                                    });
                                    logIt(r);
                                    setExtTitle("");
                                    setExtUrl("");
                                    await refreshVideos();
                                }}
                            >
                                Add External Link
                            </button>
                        </div>

                        <hr />

                        {videos.length === 0 ? (
                            <div>No videos yet.</div>
                        ) : (
                            videos.map((v) => (
                                <div
                                    key={v.id}
                                    style={{
                                        padding: 10,
                                        border: "1px solid #eee",
                                        borderRadius: 8,
                                        display: "grid",
                                        gap: 6
                                    }}
                                >
                                    <div>
                                        <b>{v.title}</b>{" "}
                                        <span style={{ opacity: 0.7 }}>({v.sourceType})</span>
                                        {v.missing ? (
                                            <span style={{ color: "crimson", marginLeft: 8 }}>
                                                MISSING FILE
                                            </span>
                                        ) : null}
                                    </div>

                                    {v.sourceType === "local" && v.fileUrl ? (
                                        <video controls style={{ width: "100%" }} src={v.fileUrl} />
                                    ) : null}

                                    {v.sourceType === "external" && v.externalUrl ? (
                                        <div style={{ display: "flex", gap: 8 }}>
                                            <a href={v.externalUrl} target="_blank" rel="noreferrer">
                                                {v.externalUrl}
                                            </a>
                                            <button
                                                onClick={async () => {
                                                    const r = await window.api.videos.openExternal(
                                                        v.externalUrl
                                                    );
                                                    logIt(r);
                                                }}
                                            >
                                                Open External
                                            </button>
                                        </div>
                                    ) : null}

                                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                        <button
                                            onClick={async () => {
                                                const r = await window.api.videos.delete(v.id);
                                                logIt(r);
                                                await refreshVideos();
                                                await refreshPlaylistItems(selectedPlaylistId);
                                            }}
                                        >
                                            Delete from Library
                                        </button>

                                        <button
                                            disabled={!selectedPlaylistId}
                                            onClick={async () => {
                                                const r = await window.api.playlists.additem({
                                                    playlistId: Number(selectedPlaylistId),
                                                    videoId: v.id
                                                });
                                                logIt(r);
                                                await refreshPlaylistItems(selectedPlaylistId);
                                            }}
                                        >
                                            Add to Selected Playlist
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* PLAYLISTS */}
                <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
                    <h3>Playlists</h3>

                    <div style={{ display: "grid", gap: 8 }}>
                        <input
                            placeholder="New playlist name"
                            value={newPlaylistName}
                            onChange={(e) => setNewPlaylistName(e.target.value)}
                        />
                        <button
                            onClick={async () => {
                                const r = await window.api.playlists.create({ name: newPlaylistName });
                                logIt(r);
                                setNewPlaylistName("");
                                await refreshPlaylists();
                            }}
                        >
                            Create Playlist
                        </button>
                        <button onClick={refreshPlaylists}>Refresh</button>
                    </div>

                    <hr />

                    <div style={{ display: "grid", gap: 8 }}>
                        <label>
                            Select playlist:
                            <select
                                value={selectedPlaylistId}
                                onChange={async (e) => {
                                    const pid = e.target.value;
                                    setSelectedPlaylistId(pid);
                                    await refreshPlaylistItems(pid);
                                }}
                                style={{ marginLeft: 8 }}
                            >
                                <option value="">(none)</option>
                                {playlists.map((p) => (
                                    <option key={p.id} value={String(p.id)}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        {selectedPlaylistId ? (
                            <button
                                onClick={async () => {
                                    const r = await window.api.playlists.delete({
                                        playlistId: Number(selectedPlaylistId)
                                    });
                                    logIt(r);
                                    setSelectedPlaylistId("");
                                    setPlaylistItems([]);
                                    await refreshPlaylists();
                                }}
                            >
                                Delete Selected Playlist
                            </button>
                        ) : null}
                    </div>

                    <div style={{ marginTop: 12 }}>
                        <h4>Playlist Items</h4>
                        {playlistItems.length === 0 ? (
                            <div>No items.</div>
                        ) : (
                            playlistItems.map((v) => (
                                <div
                                    key={v.id}
                                    style={{
                                        padding: 10,
                                        border: "1px solid #eee",
                                        borderRadius: 8,
                                        marginBottom: 8
                                    }}
                                >
                                    <b>{v.title}</b>{" "}
                                    <span style={{ opacity: 0.7 }}>({v.sourceType})</span>
                                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                        <button
                                            onClick={async () => {
                                                const r = await window.api.playlists.removeitem({
                                                    playlistId: Number(selectedPlaylistId),
                                                    videoId: v.id
                                                });
                                                logIt(r);
                                                await refreshPlaylistItems(selectedPlaylistId);
                                            }}
                                        >
                                            Remove from Playlist
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
                <h3>Log</h3>
                <pre style={{ whiteSpace: "pre-wrap" }}>{log}</pre>
            </div>
        </div>
    );
}