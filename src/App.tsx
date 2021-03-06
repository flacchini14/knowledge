import React from "react";
import { Route, Switch } from "react-router-dom";
import "./App.css";
import { RelationContext } from "./DataContext";
import { NoteDetail } from "./NoteDetail";
import { Timeline } from "./Timeline";
import Immutable from "immutable";
import { Storage } from "@stacks/storage";
import { UserSession } from "@stacks/connect";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQueryClient
} from "react-query";

import { saveDataStore } from "./storage";

import { useQueries } from "./useQueries";

export const TIMELINE = "TIMELINE";

function Main({ userSession }: { userSession: UserSession }): JSX.Element {
  const queryClient = useQueryClient();
  const { userQuery, storageQuery } = useQueries({ userSession });

  const storage = new Storage({ userSession });

  const updateStorageMutation = useMutation(
    (newData: Store) => saveDataStore(storage, newData),
    {
      onMutate: async (newStore: Store) => {
        await queryClient.cancelQueries("store");
        const previousValue = queryClient.getQueryData("store");
        queryClient.setQueryData("store", newStore);
        return previousValue;
      },
      onError: (err, variables, previousValue) => {
        queryClient.setQueryData("store", previousValue);
      },
      onSuccess: () => {
        queryClient.invalidateQueries("store");
      }
    }
  );

  if (
    userQuery.isLoading ||
    storageQuery.isLoading ||
    storageQuery.data === undefined
  ) {
    return <div className="loading" />;
  }

  const dataStore = storageQuery.data;

  const addBucket = (nodes: Immutable.Map<string, KnowNode>) => {
    const newStorage = { nodes: dataStore.nodes.merge(nodes) };
    updateStorageMutation.mutate(newStorage);
  };

  return (
    <div className="h-100">
      <div
        id="app-container"
        className="menu-default menu-sub-hidden main-hidden sub-hidden"
      >
        <main>
          <div className="container-fluid">
            <div className="dashboard-wrapper">
              <RelationContext.Provider
                value={{
                  nodes: dataStore.nodes,
                  addBucket
                }}
              >
                <Switch>
                  <Route exact path="/">
                    <Timeline
                      view={dataStore.nodes.get(TIMELINE) as KnowNode}
                    />
                  </Route>
                  <Route path="/notes/:id">
                    <NoteDetail />
                  </Route>
                </Switch>
              </RelationContext.Provider>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function App({ userSession }: { userSession: UserSession }): JSX.Element {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <Main userSession={userSession} />
    </QueryClientProvider>
  );
}

export default App;
