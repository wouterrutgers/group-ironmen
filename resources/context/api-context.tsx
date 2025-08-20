import { useEffect, useMemo, useState, type ReactElement, type ReactNode } from "react";
import { type GroupCredentials } from "../api/credentials";
import * as RequestSkillData from "../api/requests/skill-data";
import { createContext } from "react";
import Api from "../api/api";
import { useLocalStorage } from "../hooks/local-storage";
import DemoApi from "../api/demo-api";

interface APIContext {
  /**
   * Forcefully close the API, ending intervals and clearing member data
   * including local storage entries for credentials.
   */
  logOut?: () => void;
  logIn?: (credentials: GroupCredentials) => void;
  logInDemo?: () => void;

  active: boolean;

  credentials?: GroupCredentials;

  /**
   * For a given aggregate period, fetch the skill data for the group whose
   * credentials are loaded by the API.
   */
  fetchSkillData?: (period: RequestSkillData.AggregatePeriod) => Promise<RequestSkillData.Response>;

  setUpdateCallbacks?: Api["overwriteSomeUpdateCallbacks"];

  renameMember?: Api["renameGroupMember"];
  addMember?: Api["addGroupMember"];
  deleteMember?: Api["deleteGroupMember"];
}

// eslint-disable-next-line react-refresh/only-export-components
export const Context = createContext<APIContext>({ active: false });

const LOCAL_STORAGE_KEY_GROUP_NAME = "groupName";
const LOCAL_STORAGE_KEY_GROUP_TOKEN = "groupToken";

const validateCredential = (value: string | undefined): string | undefined => {
  if (!value || value === "") return undefined;
  return value;
};

export const APIProvider = ({ children }: { children: ReactNode }): ReactElement => {
  const [groupName, setGroupName] = useLocalStorage({
    key: LOCAL_STORAGE_KEY_GROUP_NAME,
    defaultValue: undefined,
    validator: validateCredential,
  });
  const [groupToken, setGroupToken] = useLocalStorage({
    key: LOCAL_STORAGE_KEY_GROUP_TOKEN,
    defaultValue: undefined,
    validator: validateCredential,
  });

  const credentials: GroupCredentials | undefined = useMemo(() => {
    if (!groupName || !groupToken) return undefined;
    return { name: groupName, token: groupToken };
  }, [groupName, groupToken]);

  const [demoIsOverriding, setDemoIsOverriding] = useState<boolean>(false);
  const [api, setApi] = useState<Api | DemoApi>();

  useEffect(() => {
    if (demoIsOverriding) {
      const newApi = new DemoApi();
      setApi(newApi);
      return (): void => {
        newApi.close();
      };
    }

    if (!credentials) return;
    const newApi = new Api(credentials);
    setApi(newApi);
    return (): void => {
      newApi.close();
    };
  }, [credentials, demoIsOverriding]);

  const apiContext: APIContext = {
    logOut: (): void => {
      setGroupName(undefined);
      setGroupToken(undefined);
    },
    logIn: ({ name, token }: GroupCredentials): void => {
      setGroupName(name);
      setGroupToken(token);
      setDemoIsOverriding(false);
    },
    logInDemo: (): void => {
      setDemoIsOverriding(true);
    },
    active: !!api,
    credentials: demoIsOverriding ? { name: "Demo Group", token: "00000000-0000-0000-0000-000000000000" } : credentials,
  };

  if (api?.isOpen()) {
    apiContext.fetchSkillData = (period: RequestSkillData.AggregatePeriod): ReturnType<Api["fetchSkillData"]> => {
      return api.fetchSkillData(period);
    };
    apiContext.setUpdateCallbacks = (callbacks: Parameters<Api["overwriteSomeUpdateCallbacks"]>[0]): void => {
      api.overwriteSomeUpdateCallbacks(callbacks);
    };

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    apiContext.addMember = (member) => api.addGroupMember(member);
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    apiContext.deleteMember = (member) => api.deleteGroupMember(member);
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    apiContext.renameMember = (member) => api.renameGroupMember(member);
  }

  return <Context value={apiContext}>{children}</Context>;
};
