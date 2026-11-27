# The record holds data written by the Worker. Only folder variables can be set.
conductive_read_repository_folders() {
  [ -f "$1" ] && [ -r "$1" ] && [ ! -L "$1" ] || return 0
  while IFS= read -r conductive_folder_line; do
    conductive_folder_name=${conductive_folder_line%%=*}
    conductive_folder_path=${conductive_folder_line#*=}
    case "$conductive_folder_name" in
      *[!A-Z0-9_]*) continue ;;
      CONDUCTIVE_REPOSITORY_?*_DIR) ;;
      *) continue ;;
    esac
    case "$conductive_folder_path" in
      /home/user/code/*)
        case "${conductive_folder_path#/home/user/code/}" in
          ''|.|..|*[!a-zA-Z0-9._-]*) continue ;;
        esac ;;
      /home/user/conductive/repositories/*)
        case "${conductive_folder_path#/home/user/conductive/repositories/}" in
          ''|.|..|*[!a-zA-Z0-9._%~\!\'\*\(\)-]*) continue ;;
        esac ;;
      *) continue ;;
    esac
    "$2" "$conductive_folder_name" "$conductive_folder_path"
  done < "$1"
  unset conductive_folder_line conductive_folder_name conductive_folder_path
}

conductive_export_repository_folder() {
  export "$1=$2"
}
