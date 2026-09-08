import { PageHeader } from "@/components/layout/page-header";
import {
  getPackages,
  getServiceCategories,
  getServicesWithUsage,
} from "@/lib/actions/services";
import { getConsumableProducts } from "@/lib/actions/products";
import { canManageRecords } from "@/lib/auth/permissions";
import { CategoryForm } from "@/components/features/services/category-form";
import { PackageForm } from "@/components/features/services/package-form";
import { ServiceForm } from "@/components/features/services/service-form";
import {
  PackagesList,
  ServiceCategoriesTable,
  ServicesTable,
} from "@/components/features/services/services-lists";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function ServicesPage() {
  const [categories, servicesRaw, packages, consumables, canManage] = await Promise.all([
    getServiceCategories(),
    getServicesWithUsage(),
    getPackages(),
    getConsumableProducts(),
    canManageRecords(),
  ]);

  const services = (servicesRaw ?? []).map((s) => {
    const usage = s.usage ?? [];
    return {
      id: s.id,
      name: s.name,
      description: s.description,
      price: Number(s.price),
      duration_minutes: s.duration_minutes,
      is_active: s.is_active,
      category_id: s.category_id,
      category: s.category as { id: string; name: string } | null,
      usageCount: usage.length,
      usageRows: usage.map((u) => ({
        productId: u.product_id,
        quantity: Number(u.quantity_per_service),
      })),
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Services"
        description="Manage service categories, individual services, packages, and in-house products used during each service."
      />

      <Tabs defaultValue="services">
        <TabsList>
          <TabsTrigger value="services">Services ({services.length})</TabsTrigger>
          <TabsTrigger value="categories">Categories ({categories.length})</TabsTrigger>
          <TabsTrigger value="packages">Packages ({packages.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-6">
          {canManage && (
            <Card>
              <CardHeader>
                <CardTitle>Add service</CardTitle>
                <CardDescription>
                  Create a salon service and optionally link in-house products used each time it
                  is performed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ServiceForm categories={categories} consumables={consumables} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>All services</CardTitle>
            </CardHeader>
            <CardContent>
              <ServicesTable
                services={services}
                categories={categories}
                consumables={consumables}
                canManage={canManage}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          {canManage && (
            <Card>
              <CardHeader>
                <CardTitle>Add category</CardTitle>
              </CardHeader>
              <CardContent>
                <CategoryForm />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <ServiceCategoriesTable categories={categories} canManage={canManage} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="packages" className="space-y-6">
          {canManage && (
            <Card>
              <CardHeader>
                <CardTitle>Add package</CardTitle>
              </CardHeader>
              <CardContent>
                <PackageForm services={services as never} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Packages</CardTitle>
            </CardHeader>
            <CardContent>
              <PackagesList packages={packages} canManage={canManage} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
