import { createFileRoute } from "@tanstack/react-router";

import { SalaEncuentro } from "@/components/fabrica/SalaEncuentro";

export const Route = createFileRoute("/sala-de-encuentro")({
  component: SalaEncuentro,
});
