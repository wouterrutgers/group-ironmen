import { useContext, useEffect, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Context as APIContext } from "../../context/api-context";

export const DemoPage = (): ReactNode => {
  const { logInDemo } = useContext(APIContext);

  useEffect(() => {
    logInDemo?.();
  }, [logInDemo]);

  return <Navigate to="/group/items" replace />;
};
