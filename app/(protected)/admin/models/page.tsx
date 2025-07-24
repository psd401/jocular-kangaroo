import { Suspense } from "react"
import { AiModelsClient } from "@/components/features/ai-models-client"
import { requireRole } from "@/lib/auth/role-helpers"
import { getAIModels } from "@/lib/db/data-api-adapter"
import type { SelectAiModel } from "@/types/db-types"


export default async function ModelsPage() {
  await requireRole("administrator");
  
  // Fetch AI models from the database
  const models = await getAIModels();
  
  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">AI Models Management</h1>
      <Suspense fallback={<div>Loading models...</div>}>
        <AiModelsClient initialModels={models as SelectAiModel[] || []} />
      </Suspense>
    </div>
  )
} 