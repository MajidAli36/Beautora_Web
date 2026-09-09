import { PageHeader } from "@/components/layout/page-header";
import {
  getPackages,
  getServiceCategories,
  getServicesWithUsage,
} from "@/lib/actions/services";
import { getConsumableProducts } from "@/lib/actions/products";
import { getCapabilities } from "@/lib/auth/permissions";
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
  const [categories, servicesRaw, packages, consumables, caps] = await Promise.all([
    getServiceCategories(),
    getServicesWithUsage(),
    getPackages(),
    getConsumableProducts(),
    getCapabilities("services"),
  ]);
  const canManage = caps.canManage;

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
        description="Create customer-facing services, then link in-house stock. Customers pay the service price only — cream/ml usage is tracked internally."
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
                  Name, price, and duration only. After saving, use{" "}
                  <strong>Use in-house stock</strong> on that row to link cream/ml usage.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ServiceForm categories={categories} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>All services</CardTitle>
                <CardDescription>
                  Use in-house stock sets how much back-bar product is deducted at POS. It is not
                  added to the customer bill — only stock and cost are tracked.
                </CardDescription>
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
