import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { ArrowRight, ArrowLeft, Upload, FileSpreadsheet, X } from 'lucide-react'

export default function Step4FlexibleImport() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    onDrop: files => setFile(files[0] ?? null),
  })

  return (
    <div className="space-y-8">
      <div>
        <div className="text-sm text-muted-foreground mb-2">Step 4 of 7</div>
        <h1 className="text-2xl font-semibold">Flexible Import</h1>
        <p className="text-muted-foreground mt-1">
          Upload a spreadsheet from your supplier or QuickBooks. We'll help you map the columns to implementation fields.
        </p>
      </div>

      {!file ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'}`}
        >
          <input {...getInputProps()} />
          <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
          <p className="font-medium">Drop your file here, or click to browse</p>
          <p className="text-sm text-muted-foreground mt-1">Supports .csv, .xlsx, .xls</p>
        </div>
      ) : (
        <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
          <FileSpreadsheet className="h-8 w-8 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {(file.size / 1024).toFixed(1)} KB — ready to map columns
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {file && (
        <div className="rounded-lg border p-4 bg-muted/20 space-y-2">
          <p className="text-sm font-medium">Column Mapping</p>
          <p className="text-sm text-muted-foreground">
            Upload the file to the API to preview rows and map columns to implementation fields (Item Name, UOM, Category, etc.).
          </p>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={() => navigate('/wizard/step/3')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Button onClick={() => navigate('/wizard/step/5')}>
          {file ? 'Continue to Review' : 'Skip this step'}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
