import { Logo } from "@/components/layout/Logo";

export default function AuthLayout({ children }: LayoutProps<"/auth">) {
  return (
    <div className="flex min-h-screen flex-col px-4">
      <div className="mx-auto w-full max-w-[400px] pt-10 pb-16 md:pt-20">
        <div className="mb-8">
          <Logo />
        </div>
        {children}
      </div>
    </div>
  );
}
