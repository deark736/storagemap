const BASE = '/api/items';

async function readError(res) {
    try {
        const data = await res.json();
        return data.error || 'Something went wrong';
    } catch {
        return 'Something went wrong';
    }
}

export async function fetchItems(locationId = null) {
    const url = locationId !== null
        ? `${BASE}?locationId=${encodeURIComponent(locationId)}`
        : BASE;
    const res = await fetch(url);
    if (!res.ok) throw new Error(await readError(res));
    return res.json();
}

export async function createItem(name, locationId, extra = {}) {
    const res = await fetch(BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, locationId, ...extra }),
    });
    if (!res.ok) throw new Error(await readError(res));
    return res.json();
}

export async function updateItem(id, changes) {
    const res = await fetch(`${BASE}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
    });
    if (!res.ok) throw new Error(await readError(res));
    return res.json();
}

export async function deleteItem(id) {
    const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(await readError(res));
}