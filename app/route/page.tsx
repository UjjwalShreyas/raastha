import React, { Suspense } from "react";
import SafeRouteClient from "./SafeRouteClient";
import RouteLoading from "./loading";


export default function SafeRoutePage() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <SafeRouteClient />
    </Suspense>
  );
}
