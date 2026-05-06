import { SearchForm } from '@/components/search-form';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center gap-10 pt-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-amber-400">Find any whisky.</h1>
        <p className="mt-3 text-lg text-stone-400">
          True all-in price — shelf price, shipping, duties, taxes — from retailers worldwide.
        </p>
      </div>
      <SearchForm />
    </div>
  );
}
