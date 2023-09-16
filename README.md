# GitHub Action S3 Extract Files

This GitHub action can be used to extract certain files from a
zipfile on an S3 bucket.

A potential usecase is to extract files from a lambda function that
is deployed to S3.

## Inputs

| Name                                                                                 | Description                                                                                                                                    | Default | Required |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------- | :------: |
| <a name="input_bucket"></a> [bucket](#input_bucket)                                  | The name of the S3 bucket that contains the ZIP file                                                                                           |         |   yes    |
| <a name="input_key"></a> [key](#input_key)                                           | he name of the S3 key of the ZIP file                                                                                                          |         |   yes    |
| <a name="input_directory"></a> [directory](#input_directory)                         | The base directory for your target paths. If you do not specify a value, all paths are relative to your project directory.                     | `.`     |    no    |
| <a name="input_files"></a> [files](#input_files)                                     | A multiline string that specifies which files should be copied to your target directory. Each line should be of the form `source=destination`. |         |   yes    |
| <a name="input_fail_on_not_found"></a> [fail_on_not_found](#input_fail_on_not_found) | Specify true if you want the action to fail when a file cannot be found. Otherwise missing files will be ignored                               | `false` |   yes    |

## Outputs

no outputs

## Example

The following example will download the file `s://my-bucket/data.zip` and
move the files `logo1.png` and `logo2.png` to our working directory as
`src/logo1.png` and `src/logo2.png`

```yaml
steps:
  - name: Checkout
    uses: actions/checkout@v3

  - name: Copy files
    uses: stschulte/gh-action-s3-extract-file@v1
    with:
      bucket: my-bucket
      key: data.zip
      files: |
        logo1.png=src/logo1.png
        logo2.png=src/logo2.png
```
