# LeitorPdfApp

Advanced PDF viewer for Angular 20 with multi-document support, offline capabilities, and custom navigation features.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.0.0.

## Using as a Library in Another Angular Project

This PDF viewer can be integrated into other Angular 20 projects as a reusable module via git submodule or monorepo.

### Setup via Git Submodule

1. Add as submodule in your parent project:
```bash
cd your-angular-project
git submodule add <this-repo-url> libs/pdf-viewer
git submodule update --init --recursive
```

2. Configure TypeScript paths in your `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@pdf-viewer/*": ["libs/pdf-viewer/src/app/features/viewer/*"],
      "@pdf-viewer/core/*": ["libs/pdf-viewer/src/app/core/*"]
    }
  }
}
```

3. Import the module in your component or app config:
```typescript
import { PdfViewerModule } from '@pdf-viewer/viewer.module';

// In your component
@Component({
  imports: [PdfViewerModule],
  // ...
})
```

### Usage Options

#### Option A: Programmatic Inputs (Best for Offline/Service Workers)

```typescript
<app-viewer-page 
  [urls]="pdfUrls"
  [activeDocumentId]="activePdfId">
</app-viewer-page>
```

```typescript
export class YourComponent {
  pdfUrls = [
    'https://example.com/doc1.pdf#page=1',
    'https://example.com/doc2.pdf#page=277'
  ];
  activePdfId = 'https://example.com/doc1.pdf';
}
```

#### Option B: Query Parameters (Best for Shareable URLs)

**Single PDF with Base64 encoding:**
```javascript
// Encode single URL in Base64
const url = 'https://example.com/doc1.pdf#page=1';
const base64Url = btoa(url);
console.log(base64Url);
// Navigate to: /viewer?url={base64Url}
```

**Multiple PDFs with Base64 encoding:**
```javascript
// Encode URLs in Base64
const urls = 'https://example.com/doc1.pdf#page=1,https://example.com/doc2.pdf#page=277';
const base64Urls = btoa(urls);
console.log(base64Urls);
// Navigate to: /viewer?urls={base64Urls}
```

**Example Base64 URLs:**
```
# Single PDF
https://localhost:4200/?url=aHR0cHM6Ly9jb2xldGFuZWFkaWdpdGFsaWNtLmdpdGh1Yi5pby9jaWFzL3BkZi9jb2xldGFuZWEvMjNjMDZiNTctYWFjYS00ODNiLTk1M2QtNzI3NjYxMDMxMTQ1LnBkZiNwYWdlPTE=

# Multiple PDFs
https://localhost:4200/?urls=aHR0cHM6Ly9jb2xldGFuZWFkaWdpdGFsaWNtLmdpdGh1Yi5pby9jaWFzL3BkZi9jb2xldGFuZWEvMjNjMDZiNTctYWFjYS00ODNiLTk1M2QtNzI3NjYxMDMxMTQ1LnBkZiNwYWdlPTEsaHR0cHM6Ly9qYWlyb2ZpbGhvNzkuZ2l0aHViLmlvL2F2dWxzb3MtY2lmcmFkb3Mvc291cmNlcy8yMDI1IEdMIEFWVUxTT1MucGRmI3BhZ2U9Mjc3
```

This will load 2 PDFs: first at page 1, second at page 277.

**Note:** Both `?url` and `?urls` parameters now use Base64 encoding for consistency and to avoid URL parsing issues with special characters.

#### Option C: Both (Most Flexible)

Component accepts both inputs and query params. Inputs take priority for better offline support.

### Features

- **Multi-document tabs**: Load and switch between multiple PDFs
- **Corner tap navigation**: Tap left/right corners to navigate pages
- **Persistent settings**: User preferences saved in localStorage
- **Auto-disable on zoom**: Navigation automatically disables when zoomed
- **Fragment support**: Open PDFs at specific pages with `#page=N`
- **Offline ready**: Works with service workers when using programmatic inputs
- **Base64 URLs**: Support for encoded URL lists to avoid query param issues

### Service Worker Considerations

For offline support:
1. Use programmatic inputs (`[urls]`) rather than query params
2. Pre-cache PDF URLs in your service worker configuration
3. Component will work fully offline once PDFs are cached
4. Settings are stored in localStorage and persist offline

### Dependencies

Required peer dependencies:
- `@angular/core`: ^20.0.0
- `@angular/common`: ^20.0.0
- `@angular/router`: ^20.0.0
- `ngx-extended-pdf-viewer`: ^24.2.5
- `rxjs`: ~7.8.0

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
