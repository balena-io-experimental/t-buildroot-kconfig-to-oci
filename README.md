# Transformer template

This is a template repository to create your own Transformer.

If you want to learn more about Transformers, there are
* [the spec](https://docs.google.com/document/d/1zd3pX9Q_4kXGEnnATNdUmBBRS9R_BZB6JZoKguwX8Vk)
* [the tutorial](https://docs.google.com/document/d/1iPsyXBjnvzG25hNHztIFsUcLDM1gSAIhNTHJDY8pZJ0) on how to set them up
* an [entrypoint](https://docs.google.com/document/d/12PCjfMGLq2gkpvGbzNGfVzMM5jRRul-c2vwedPDooWc) document giving more helpful links

## HOW does a single Transformer run

A Transformer is a docker image which receives
* an `INPUT` env var, which points to a JSON file containing an [input manifest](https://github.com/product-os/transformer-runtime/blob/master/lib/types/index.ts)
  * that manifest contains a [contract](https://github.com/balena-io/balena-io/blob/contracts-spec/specs/contracts.md) and a relative path where a directory with artifacts for this contract can be found
* an `OUTPUT` env var which points to a path, where the Transformer should write an [output manifest](https://github.com/product-os/transformer-runtime/blob/master/lib/types/index.ts)
  * that manifest contains a list of contracts and teh relative paths for their artifacts, which the Transformer has produced (if any)
* volume mounts for the above paths

That's it. The Transformer is (technically) completely free what it does with its input and how to shape its output, but the output manifest must reflect this shape. E.g. when this is your ourput
```
# $OUTPUT=/tf-out/manifest.json
/opt/transformers/out/
\ - manifest.json
  - myresults
  \ - file1.txt
    - file2.tar
```
Then your manifest should look like this: (or as json)
```yaml
results:
- contract: { ... }
  artifactPath: ./myresults # as this must be relative to the manifest's location
```
It's always a good idea to place your results in a sub-directory to ensure you don't add the manifest into the artifacts as well

## Rules for Transformers

To make things work in a predictable way, there are some rules (which we will enforce eventually):
* It must be idempotent. That means, running with the same input should produce the same output. That specifically means it should not depend on some outside state. Practically that means that something predictable like `npm ci` is fine, but querying the current weather is not.
* The output types must exist. If they don't, the Transformer Worker will not be able to upload the results to Jellyfish

## WHEN does a Transformer run

Transformers are scheduled to run by Jellyfish and run by the Transformer Worker, if
* they are in JF (i.e. the first PR in its repo has passed successfully the Transformer CI)
* they are owned by a loop. You can see and change that in the "All Transformers" view in JF. (In the future this will be replaced by Loop admins "installing" Transformers into their loops). The loop will be the creator of all contracts created by this Transformer
* their `inputFilter` in their contract (see `balena.yml`), which is a JSON schema, matches a new or changed contract in the system. Transformers don't run against previously existing things

## How can I COMPOSE Transformers

When the output of Transformer A matches the input filter of Transformer B they will automatically run in succession.

TODO:
* describe how to update the input contracts
* describe how that can be used with `composedOf`, once we implement support for it

## Other Resources

- [Transformer Runtime](https://github.com/product-os/transformer-runtime)
- [Transformer Tutorial](https://docs.google.com/document/d/1iPsyXBjnvzG25hNHztIFsUcLDM1gSAIhNTHJDY8pZJ0/)
