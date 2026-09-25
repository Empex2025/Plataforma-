"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { AccountDataTab } from "./_components/account-data-tab"
import { TeamTab } from "./_components/team-tab"
import { VerifiedDataTab } from "./_components/verified-data-tab"

export default function ConfiguracoesPage() {
  return (
    <div className="flex flex-col gap-6">
      <Tabs defaultValue="account">
        <TabsList variant="line">
          <TabsTrigger value="account">Dados da Conta</TabsTrigger>
          <TabsTrigger value="verified">Dados Conta Verificada</TabsTrigger>
          <TabsTrigger value="team">Equipe</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="pt-6">
          <AccountDataTab />
        </TabsContent>

        <TabsContent value="verified" className="pt-6">
          <VerifiedDataTab />
        </TabsContent>

        <TabsContent value="team" className="pt-6">
          <TeamTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
