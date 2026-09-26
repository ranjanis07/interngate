// Dropbox is used here purely as a Storage-as-a-Service backend for
// offer-letter PDFs and profile photos — the app never touches a file
// server or bucket directly, it just calls Dropbox's hosted HTTP API and
// stores back the resulting share link.
//
// Set REACT_APP_DROPBOX_ACCESS_TOKEN in your .env file. Generate the
// token from the Dropbox App Console: Settings tab -> "Generate access
// token" (after enabling files.content.write, files.content.read,
// sharing.write on the Permissions tab and clicking Submit).

const DROPBOX_ACCESS_TOKEN = process.env.REACT_APP_DROPBOX_ACCESS_TOKEN;
const DROPBOX_FOLDER = "/offer_letters";
const DROPBOX_PHOTO_FOLDER = "/profile_photos";
const DROPBOX_CERT_FOLDER = "/certificates";

async function uploadToDropbox(file, folder, ownerId) {
  if (!DROPBOX_ACCESS_TOKEN) {
    throw new Error(
      "Missing REACT_APP_DROPBOX_ACCESS_TOKEN. Add it to your .env file and restart the dev server."
    );
  }

  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${folder}/${ownerId}_${Date.now()}_${cleanName}`;

  const uploadRes = await fetch("https://content.dropboxapi.com/2/files/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DROPBOX_ACCESS_TOKEN}`,
      "Dropbox-API-Arg": JSON.stringify({
        path,
        mode: "add",
        autorename: true,
        mute: true,
      }),
      "Content-Type": "application/octet-stream",
    },
    body: file,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Dropbox upload failed (${uploadRes.status}): ${errText}`);
  }
  const uploaded = await uploadRes.json();

  const rawUrl = await createOrGetSharedLink(uploaded.path_lower);
  const directUrl = toDirectDropboxUrl(rawUrl);

  return { url: directUrl, name: file.name };
}

/**
 * Converts a Dropbox shared link (dl=0 HTML page or dl=1 attachment)
 * into a direct raw media link (raw=1) so that <img> tags and browser
 * previews render the file immediately without downloading or showing
 * Dropbox web UI.
 */
export function toDirectDropboxUrl(url) {
  if (!url || typeof url !== "string") return "";
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("dropbox.com")) {
      parsed.searchParams.delete("dl");
      parsed.searchParams.set("raw", "1");
      return parsed.toString();
    }
  } catch (e) {
    return url.replace(/([?&])dl=[01](&|$)/, "$1raw=1$2");
  }
  return url;
}

async function createOrGetSharedLink(path) {
  const createRes = await fetch(
    "https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DROPBOX_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path }),
    }
  );

  if (createRes.ok) {
    const data = await createRes.json();
    return data.url;
  }

  const listRes = await fetch("https://api.dropboxapi.com/2/sharing/list_shared_links", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DROPBOX_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ path, direct_only: true }),
  });
  const listData = await listRes.json();
  if (listData.links && listData.links.length) return listData.links[0].url;

  throw new Error("Could not create a Dropbox share link for the uploaded file.");
}

export function uploadOfferLetter(file, studentId) {
  return uploadToDropbox(file, DROPBOX_FOLDER, studentId);
}

export function uploadProfilePhoto(file, userId) {
  return uploadToDropbox(file, DROPBOX_PHOTO_FOLDER, userId);
}

export function uploadCertificate(file, studentId) {
  return uploadToDropbox(file, DROPBOX_CERT_FOLDER, studentId);
}