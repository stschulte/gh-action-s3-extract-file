# GitHub Action S3 Extract Files

[![Continuous Integration](https://github.com/stschulte/gh-action-s3-extract-file/actions/workflows/ci.yml/badge.svg)](https://github.com/stschulte/gh-action-s3-extract-file/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/stschulte/gh-action-s3-extract-file/graph/badge.svg?token=9TZB9WPY7L)](https://codecov.io/gh/stschulte/gh-action-s3-extract-file)

This GitHub action can be used to extract certain files from a
zipfile on an S3 bucket.

A potential usecase is to extract files from a lambda function that
is deployed to S3.

<!-- markdownlint-capture -->
<!-- markdownlint-disable -->
<!-- prettier-ignore-start -->
<!-- BEGIN_GITHUB_ACTION_DOCS -->
## Inputs

| Name | Description | Default | Required |
|------|-------------|---------|:--------:|
| <a name="input_bucket"></a> [bucket](#input\_bucket) | The name of the S3 bucket that contains the ZIP file |  | yes |
| <a name="input_key"></a> [key](#input\_key) | The name of the S3 key of the ZIP file |  | yes |
| <a name="input_directories"></a> [directories](#input\_directories) | A multiline string that specifies which directories should be copied to your target directory. Each line should be of the form `source=destination` |  | no |
| <a name="input_fail_on_not_found"></a> [fail\_on\_not\_found](#input\_fail\_on\_not\_found) | Specify true if you want the action to fail when a file cannot be found. Otherwise missing files will be ignored | `false` | no |
| <a name="input_files"></a> [files](#input\_files) | A multiline string that specifies which files should be copied to your target directory. Each line should be of the form `source=destination` |  | no |
| <a name="input_source_base_directory"></a> [source\_base\_directory](#input\_source\_base\_directory) | The base directory for the source path. If you do not specify a value, all paths are relative the the zip extraction | `.` | no |
| <a name="input_target_base_directory"></a> [target\_base\_directory](#input\_target\_base\_directory) | The base directory for your target paths. If you do not specify a value, all paths are relative to your project directory | `.` | no |

## Outputs

(none)
<!-- END_GITHUB_ACTION_DOCS -->
<!-- prettier-ignore-end -->
<!-- markdownlint-restore -->

## Example

The following example will download the file `s://my-bucket/data.zip` and
move the files `logo1.png` and `logo2.png` to our working directory as
`src/logo1.png` and `src/logo2.png`

```yaml
steps:
  - name: Checkout
    uses: actions/checkout@v5

  - name: Copy files
    uses: stschulte/gh-action-s3-extract-file@v2
    with:
      bucket: my-bucket
      key: data.zip
      files: |
        logo1.png=src/logo1.png
        logo2.png=src/logo2.png
```
