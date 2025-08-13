import * as Member from "../../game/member";
import type { GroupCredentials } from "../credentials";

export type Response = { status: "ok" } | { status: "error"; text: string };

export const renameGroupMember = ({
  baseURL,
  credentials,
  oldName,
  newName,
}: {
  baseURL: string;
  credentials: GroupCredentials;
  oldName: Member.Name;
  newName: Member.Name;
}): Promise<Response> =>
  fetch(`${baseURL}/group/${credentials.name}/rename-group-member`, {
    body: JSON.stringify({ original_name: oldName, new_name: newName }),
    headers: {
      "Content-Type": "application/json",
      Authorization: credentials.token,
    },
    method: "PUT",
  }).then((response) => {
    if (response.status === 400) {
      return response.text().then((text) => ({ status: "error", text }));
    }

    if (!response.ok && response.status !== 400) {
      throw new Error("renameGroupMember HTTP response was not OK");
    }

    return { status: "ok" };
  });
