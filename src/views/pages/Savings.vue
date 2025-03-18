<script setup></script>

<template>
    <div class="flex flex-col">
        <div class="card">
            <div class="font-semibold text-xl mb-4"></div>
            <Toolbar class="mb-6">
                <template #start>
                    <Button label="Nuevo" icon="pi pi-plus" severity="secondary" class="mr-2" />
                    <Button label="Borrar" icon="pi pi-trash" severity="secondary" class="mr-2" />
                    <Button label="Actualizar" icon="pi pi-refresh" severity="secondary" class="mr-2" />
                </template>
                <template #end>
                    <Button label="Exportar" icon="pi pi-upload" severity="secondary" />
                </template>
            </Toolbar>
        </div>

        <div class="card">
            <div class="font-semibold text-xl mb-4">Ahorros <small class="text-gray-500">(partidas de dinero que se guardan para un fin concreto)</small></div>

            <p></p>
        </div>
    </div>
</template>
